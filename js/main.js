/*jslint browser: true, node: true*/
/*global SpotifyWebApi, Spotify, window, ons, simpleQueryString, cordova, MusicControls*/

if (typeof window !== 'object') {
    throw 'SpotSlim must be used in a browser.';
}

var SpotifyWebApi = require('spotify-web-api-js'),
    ons = require('onsenui'),
    simpleQueryString = require('simple-query-string');

//CSS
require('onsenui/css/onsenui-core.css');
require('onsenui/css/onsen-css-components.css');
require('onsenui/css/font_awesome/css/font-awesome.css');

var spotslim = (function () {
    'use strict';
    if (typeof SpotifyWebApi !== 'function') {
        throw 'spotify-web-api-js is not loaded.';
    }

    var appId = 'b7b9dd79c3fb44f2896a676b293e1e01',
        spotify = new SpotifyWebApi(),
        myDevice,
        curAlbums = [],
        infinityScrollCallback,
        albumList,
        player,
        playerBar = {},
        pageNavigator,
        token;

    function askToken(redirect) {
        var redirectUri;
        if (typeof cordova === 'object') {
            redirectUri = 'spotslim://';
        } else {
            redirectUri = window.location.origin + window.location.pathname;
        }
        if (redirect) {
            window.location = 'https://accounts.spotify.com/authorize/?client_id=' + appId + '&redirect_uri=' + redirectUri + '&response_type=token&scope=streaming%20user-read-birthdate%20user-read-email%20user-read-private%20user-library-read';
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

    function playbackError(error) {
        ons.notification.alert({
            message: error.message,
            title: 'Error',
            cancelable: true
        });
    }

    function getToken(callback) {
        var query = simpleQueryString.parse(window.location.search);
        if (query.error && query.error === 'access_denied') {
            authError({message: 'Spotify access denied.'});
            return;
        }
        if (!token) {
            token = simpleQueryString.parse(window.location.hash).access_token;
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

    function playTrack(e) {
        spotify.play(
            {
                context_uri: e.currentTarget.dataset.uri,
                device_id: myDevice.device_id
            }
        );
        /**
         * We need this hack because on Android Chrome playback has to be triggered by a click event
         * @see https://github.com/spotify/web-playback-sdk/issues/5
         */
        setTimeout(resume, 1000);
    }

    function getAlbumListItem(album) {
        var listItem = ons.createElement(
            '<ons-list-item tappable data-uri="' + album.uri + '">' +
                '<div class="left"><img class="list-item__thumbnail" src="' + album.images[2].url + '"></div>' +
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

    function initHomePage(page) {
        page.onInfiniteScroll = loadMoreAlbums;
        albumList = document.getElementById('album-list');
        spotify.getMySavedAlbums(null, listAlbums);
    }

    function initApi(device) {
        myDevice = device;
        spotify.setAccessToken(getToken());
        pageNavigator.replacePage('templates/home.html', {callback: initHomePage});
    }

    function musicControlsEvents(action) {
        switch (JSON.parse(action).message) {
        case 'music-controls-next':
            nextTrack();
            break;
        case 'music-controls-previous':
            previousTrack();
            break;
        case 'music-controls-play':
        case 'music-controls-pause':
        case 'music-controls-media-button-headset-hook':
            togglePlay();
            break;
        }
    }

    function updatePlayer(playbackState) {
        if (playbackState) {
            var isPlaying;
            playerBar.title.innerHTML = playbackState.track_window.current_track.name + '<br/>' + playbackState.track_window.current_track.artists[0].name;
            playerBar.progress.value = (playbackState.position / playbackState.duration) * 100;
            playerBar.previous.disabled = false;
            playerBar.next.disabled = false;
            playerBar.toggle.disabled = false;
            if (playbackState.paused) {
                isPlaying = false;
                playerBar.toggle.icon.setAttribute('icon', 'fa-play');
            } else {
                isPlaying = true;
                playerBar.toggle.icon.setAttribute('icon', 'fa-pause');
            }

            if (typeof MusicControls === 'object') {
                MusicControls.create({
                    track: playbackState.track_window.current_track.name,
                    artist: playbackState.track_window.current_track.artists[0].name,
                    cover: playbackState.track_window.current_track.album.images[0].url,
                    isPlaying: isPlaying
                });
                MusicControls.subscribe(musicControlsEvents);
                MusicControls.listen();
            }
        }
    }

    function initPlayer() {
        player = new Spotify.Player({
            name: 'SpotSlim',
            getOAuthToken: getToken
        });

        player.on('ready', initApi);
        player.on('player_state_changed', updatePlayer);
        player.on('authentication_error', authError);
        player.on('account_error', authError);
        player.on('initialization_error', authError);
        player.on('playback_error', playbackError);

        player.connect();
    }


    function search(page) {
        document.getElementById('search-term').textContent = page.data.term;
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

        playerBar.next.addEventListener('click', nextTrack, false);
        playerBar.previous.addEventListener('click', previousTrack, false);
        playerBar.toggle.addEventListener('click', togglePlay, false);

        document.getElementById('search').addEventListener('click', getSearchTerm, false);
    }

    function customSchemeHandler(url) {
        token = simpleQueryString.parse(url.replace('spotslim://#', '')).access_token;
        initPlayer();
    }

    return {
        init: init,
        initPlayer: initPlayer,
        customSchemeHandler: customSchemeHandler
    };
}());

window.onSpotifyWebPlaybackSDKReady = spotslim.initPlayer;

if (typeof ons === 'object') {
    ons.ready(spotslim.init);
} else {
    throw 'Onsen is not loaded';
}

window.handleOpenURL = spotslim.customSchemeHandler;
