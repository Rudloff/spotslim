/*jslint browser: true*/
/*global SpotifyWebApi, Spotify, window, ons, simpleQueryString*/

var spotslim = (function () {
    'use strict';
    if (typeof SpotifyWebApi !== 'function') {
        throw 'spotify-web-api-js is not loaded.';
    }

    var appId = 'b7b9dd79c3fb44f2896a676b293e1e01';
    var spotify = new SpotifyWebApi();
    var myDevice;
    var curAlbums = [];
    var infinityScrollCallback;
    var albumList;
    var player;
    var playerBar = {};
    var pageNavigator;

    function askToken(redirect) {
        if (redirect) {
            window.location = 'https://accounts.spotify.com/authorize/?client_id=' + appId + '&redirect_uri=' + window.location.origin + window.location.pathname + '&response_type=token&scope=streaming%20user-read-birthdate%20user-read-email%20user-read-private%20user-library-read';
        }
    }

    function authError(error) {
        ons.notification.confirm({
            message: error.message,
            title: 'Error',
            buttonLabels: ['Cancel', 'Retry'],
            callback: askToken
        });
    }

    function getToken(callback) {
        var token = simpleQueryString.parse(window.location.hash).access_token;

        var query = simpleQueryString.parse(window.location.search);
        if (query.error && query.error === 'access_denied') {
            authError({message: 'Spotify access denied.'});
            return;
        }
        if (token) {
            if (callback) {
                callback(token);
            }
            return token;
        }
        askToken(true);

        return undefined;
    }

    function playTrack(e) {
        spotify.play(
            {
                context_uri: e.currentTarget.dataset.uri,
                device_id: myDevice.device_id
            }
        );
    }

    function getAlbumListItem(album) {
        var listItem = ons.createElement(
            '<ons-list-item tappable data-uri="' + album.uri + '">' +
                '<div class="left"><img class="list-item__thumbnail" src="' + album.images[0].url + '"></div>' +
                '<div class="center"><span class="list-item__title">' + album.name + '</span><span class="list-item__subtitle">' + album.artists[0].name + '</div>' +
            '</ons-list-item>'
        );
        listItem.addEventListener('click', playTrack, false);
        return listItem;
    }

    function addAlbumItem(item, i, array) {
        var listItem = getAlbumListItem(item.album);
        albumList.appendChild(listItem);
        if (infinityScrollCallback && i === array.length - 1) {
            infinityScrollCallback();
            infinityScrollCallback = null;
        }
    }

    function addSearchResultItem(item) {
        var listItem = getAlbumListItem(item);
        document.getElementById('search-album-list').appendChild(listItem);
    }

    function listAlbums(error, data) {
        if (!error) {
            curAlbums = curAlbums.concat(data.items);
            data.items.forEach(addAlbumItem);
        }
    }

    function listSearchResults(error, data) {
        document.getElementById('search-album-list').textContent = '';
        if (!error) {
            data.albums.items.forEach(addSearchResultItem);
        }
    }

    function loadMoreAlbums(callback) {
        infinityScrollCallback = callback;
        spotify.getMySavedAlbums({offset: curAlbums.length}, listAlbums);
    }

    function initHomePage() {
        albumList = document.getElementById('album-list');
        spotify.getMySavedAlbums(null, listAlbums);
    }

    function initApi(device) {
        myDevice = device;
        spotify.setAccessToken(getToken());
        pageNavigator.replacePage('templates/home.html', {callback: initHomePage});
    }

    function updatePlayer(playbackState) {
        if (playbackState) {
            playerBar.title.innerHTML = playbackState.track_window.current_track.name + '<br/>' + playbackState.track_window.current_track.artists[0].name;
            playerBar.progress.value = (playbackState.position / playbackState.duration) * 100;
            playerBar.previous.disabled = false;
            playerBar.next.disabled = false;
            playerBar.toggle.disabled = false;
            if (playbackState.paused) {
                playerBar.toggle.icon.setAttribute('icon', 'fa-play');
            } else {
                playerBar.toggle.icon.setAttribute('icon', 'fa-pause');
            }
        }
    }

    function resume() {
        player.resume();
    }

    function nextTrack() {
        player.nextTrack().then(resume);
    }

    function previousTrack() {
        player.previousTrack().then(resume);
    }

    function togglePlay() {
        player.togglePlay();
    }

    function initPlayer() {
        player = new Spotify.Player({
            name: 'SpotSlim',
            getOAuthToken: getToken
        });

        player.on('ready', initApi);
        player.on('player_state_changed', updatePlayer);
        player.on('authentication_error', authError);

        player.connect();

        playerBar.next.addEventListener('click', nextTrack, false);
        playerBar.previous.addEventListener('click', previousTrack, false);
        playerBar.toggle.addEventListener('click', togglePlay, false);
    }


    function search(page) {
        spotify.searchAlbums(page.data.term, null, listSearchResults);
    }

    function loadSearchPage(term) {
        if (term) {
            if (pageNavigator.topPage.data.term) {
                pageNavigator.topPage.data.term = term;
                search(pageNavigator.topPage);
            } else {
                pageNavigator.bringPageTop('templates/search.html', {data: {term: term}, callback: search});
            }
        }
    }

    function getSearchTerm() {
        ons.notification.prompt({
            message: 'Album name',
            title: 'Search',
            cancelable: true,
            callback: loadSearchPage
        });
    }

    function init() {
        pageNavigator = document.getElementById('navigator');
        playerBar.title = document.getElementById('player-title');
        playerBar.progress = document.getElementById('player-progress');
        playerBar.next = document.getElementById('player-next');
        playerBar.previous = document.getElementById('player-previous');
        playerBar.toggle = document.getElementById('player-toggle');
        playerBar.toggle.icon = document.getElementById('player-toggle-icon');

        document.getElementById('search').addEventListener('click', getSearchTerm, false);

        window.onSpotifyWebPlaybackSDKReady = initPlayer;
    }

    return {
        init: init,
        loadData: loadMoreAlbums
    };
}());

if (typeof ons === 'object') {
    ons.ready(spotslim.init);
} else {
    throw 'Onsen is not loaded';
}
