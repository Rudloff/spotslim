/*jslint browser: true, node: true*/
/*global Spotify, window, cordova, MusicControls, localStorage, navigator*/

if (typeof window !== 'object') {
    throw 'SpotSlim must be used in a browser.';
}

var SpotifyWebApi = require('spotify-web-api-js'),
    ons = require('onsenui'),
    simpleQueryString = require('simple-query-string'),
    he = require('he');

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

    /**
     * Redirect the user to a Spotify page that asks for a new token.
     * @return {void}
     */
    function askToken() {
        var redirectUri;
        if (typeof cordova === 'object') {
            redirectUri = 'spotslim://';
        } else {
            redirectUri = window.location.origin + window.location.pathname;
        }
        window.location = 'https://accounts.spotify.com/authorize/?client_id=' + appId + '&redirect_uri=' + redirectUri + '&response_type=token&scope=streaming%20user-read-birthdate%20user-read-email%20user-read-private%20user-library-read';
    }

    /**
     * Display an authentication error.
     * @param  {Object} error         Error object
     * @param  {string} error.message Error message
     * @return {void}
     */
    function authError(error) {
        ons.notification.confirm({
            message: error.message,
            title: 'Error',
            buttonLabels: ['Cancel', 'Retry'],
            callback: askToken
        });
    }

    /**
     * Display a playback error.
     * @param  {Object} error         Error object
     * @param  {string} error.message Error message
     * @return {void}
     */
    function playbackError(error) {
        ons.notification.alert({
            message: error.message,
            title: 'Error',
            cancelable: true
        });
    }

    /**
     * Check if a token is available in the URL or in the local storage.
     * @return {void}
     */
    function findToken() {
        var hash = simpleQueryString.parse(window.location.hash);
        if (hash.access_token) {
            token = hash.access_token;
            localStorage.setItem(
                'spotify_token',
                JSON.stringify({
                    token: hash.access_token,
                    expires: new Date(Date.now() + (hash.expires_in * 1000))
                })
            );
        } else {
            var storageItem = JSON.parse(localStorage.getItem('spotify_token'));
            if (storageItem.token && (new Date() < new Date(storageItem.expires))) {
                token = storageItem.token;
            }
        }
    }

    /**
     * Get a Spotify API token.
     * @param  {Function} callback Function to call when we have a token
     * @return {(string|undefined)} Token (if found)
     */
    function getToken(callback) {
        var query = simpleQueryString.parse(window.location.search);
        if (query.error && query.error === 'access_denied') {
            authError({message: 'Spotify access denied.'});
            return;
        }
        if (!token) {
            findToken();
        }
        if (token) {
            if (callback) {
                callback(token);
            }
            return token;
        }
        askToken();

        return undefined;
    }

    /**
     * Resume playback.
     * @return {void}
     */
    function resume() {
        player.resume();
    }

    /**
     * Go to the next track in the album.
     * @return {void}
     */
    function nextTrack() {
        player.nextTrack().then(resume);
    }

    /**
     * Go to the previous track in the album.
     * @return {void}
     */
    function previousTrack() {
        player.previousTrack().then(resume);
    }

    /**
     * Resume/pause playback.
     * @return {void}
     */
    function togglePlay() {
        player.togglePlay();
    }

    /**
     * Start a new track.
     *
     * @param  {MouseEvent} e Event that triggered the function
     * @return {void}
     * @see https://github.com/spotify/web-playback-sdk/issues/5
     */
    function playTrack(e) {
        spotify.play(
            {
                context_uri: e.currentTarget.dataset.uri,
                device_id: myDevice.device_id
            }
        );

        //We need this hack because on Android Chrome playback has to be triggered by a click event.
        setTimeout(resume, 1000);
    }

    /**
     * Get a list item containing info about an album.
     * @param  {Object} album Album object returned by the Spotify API
     * @return {Element} ons-list-item element
     */
    function getAlbumListItem(album) {
        var listItem = ons.createElement(
            '<ons-list-item tappable data-uri="' + album.uri + '">' +
                '<div class="left"><img class="list-item__thumbnail" src="' + album.images[2].url + '"></div>' +
                '<div class="center"><span class="list-item__title">' + he.encode(album.name) + '</span><span class="list-item__subtitle">' + he.encode(album.artists[0].name) + '</div>' +
            '</ons-list-item>'
        );
        listItem.addEventListener('click', playTrack, false);
        return listItem;
    }

    /**
     * Add a list item to the album list.
     * @param {Object} item  Spotify API object
     * @param {number} i     Index of the item
     * @param {Array}  array List of Spotify objects
     * @returns {void}
     */
    function addAlbumItem(item, i, array) {
        var listItem = getAlbumListItem(item.album);
        albumList.appendChild(listItem);
        if (infinityScrollCallback && i === array.length - 1) {
            infinityScrollCallback();
            infinityScrollCallback = null;
        }
    }

    /**
     * Add a list item to the search results.
     * @param {Object} item Spotify API object
     */
    function addSearchResultItem(item) {
        var listItem = getAlbumListItem(item);
        document.getElementById('search-album-list').appendChild(listItem);
    }

    /**
     * List albums returned by the Spotify API.
     * @param  {Object} error Error object
     * @param  {Object} data  Data returned by the Spotify API
     * @return {void}
     * @see https://developer.spotify.com/web-api/check-users-saved-albums/
     */
    function listAlbums(error, data) {
        if (!error) {
            curAlbums = curAlbums.concat(data.items);
            data.items.forEach(addAlbumItem);
        }
    }

    /**
     * List search results returned by the Spotify API.
     * @param  {Object} error Error object
     * @param  {Object} data  Data returned by the Spotify API
     * @return {void}
     * @see https://developer.spotify.com/web-api/search-item/
     */
    function listSearchResults(error, data) {
        if (!error) {
            data.albums.items.forEach(addSearchResultItem);
        }
    }

    /**
     * Load more albums.
     * @param  {Function} callback Function to call when data is returned by the API
     * @return {void}
     */
    function loadMoreAlbums(callback) {
        infinityScrollCallback = callback;
        spotify.getMySavedAlbums({offset: curAlbums.length}, listAlbums);
    }

    /**
     * Function called when the home page is ready.
     * @param  {Element} page ons-page element
     * @return {void}
     */
    function initHomePage(page) {
        page.onInfiniteScroll = loadMoreAlbums;
        albumList = document.getElementById('album-list');
        spotify.getMySavedAlbums(null, listAlbums);
    }

    /**
     * Function called when the playback SDK is ready so we can initialize the API.
     * @param  {Object} device           Current Spotify device
     * @param  {string} device.device_id Device ID
     * @return {void}
     */
    function initApi(device) {
        myDevice = device;
        spotify.setAccessToken(getToken());
        pageNavigator.replacePage('templates/home.html', {callback: initHomePage});
    }

    /**
     * Function called when an event is triggered by the music controls plugin.
     * @param  {string} action JSON string containing info about the event
     * @return {void}
     * @see https://github.com/homerours/cordova-music-controls-plugin/blob/master/README.md
     */
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
        case 'music-controls-destroy':
            navigator.app.exitApp();
            break;
        default:
            break;
        }
    }

    /**
     * Upate info about the current track played by the player.
     * @param  {Object} playbackState Object returned by the playback SDK
     * @return {void}
     * @see https://beta.developer.spotify.com/documentation/web-playback-sdk/reference/#event-player-state-changed
     */
    function updatePlayer(playbackState) {
        if (playbackState) {
            var isPlaying;
            playerBar.title.innerHTML = he.encode(playbackState.track_window.current_track.name) + '<br/>' + he.encode(playbackState.track_window.current_track.artists[0].name);
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
                    isPlaying: isPlaying,
                    hasClose: true
                });
                MusicControls.subscribe(musicControlsEvents);
                MusicControls.listen();
            }
        }
    }

    /**
     * Initialize the playback SDK.
     * @return {void}
     */
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

    /**
     * Start a new search
     * @param  {Element} page ons-page element
     * @return {void}
     */
    function search(page) {
        document.getElementById('search-term').textContent = page.data.term;
        document.getElementById('search-album-list').textContent = '';
        spotify.searchAlbums(page.data.term, null, listSearchResults);
    }

    /**
     * Load and open the search page
     * @param  {string} term Search term
     * @return {void}
     */
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

    /**
     * Open a modal that asks for a search term.
     * @return {void}
     */
    function getSearchTerm() {
        ons.notification.prompt({
            message: 'Album name',
            title: 'Search',
            cancelable: true,
            callback: loadSearchPage
        });
    }

    /**
     * Initialize the app.
     * @return {void}
     */
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

    /**
     * Function called when the app is opened from a spotslim:// URL.
     * @param  {string} url URL from which the app was opened.
     * @return {void}
     */
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
