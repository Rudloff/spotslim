/*jslint browser: true, node: true*/
/*global Spotify, window, cordova, MusicControls*/

if (typeof window !== 'object') {
    throw 'SpotSlim must be used in a browser.';
}

// Check old browsers
var oldbrowsers = require('./oldbrowser.js');
oldbrowsers.init();

var ons = require('onsenui'),
    simpleQueryString = require('simple-query-string'),
    he = require('he'),
    player = require('./player.js'),
    api = require('./api.js'),
    controls = require('./controls.js');

//CSS
require('onsenui/css/onsenui-core.css');
require('onsenui/css/onsen-css-components.css');
require('onsenui/css/font_awesome/css/font-awesome.css');

/**
 * Main module constructor.
 * @return {Object} Main module
 */
function spotslimMain() {
    'use strict';

    var curAlbums = [],
        infinityScrollCallback,
        albumList,
        pageNavigator;

    /**
     * Get a list item containing info about an album or playlist.
     * @param  {Object} object Album or playlist object returned by the Spotify API
     * @return {Element} ons-list-item element
     */
    function getListItem(object) {
        var image, artist;
        if (object.images[2]) {
            image = object.images[2];
        } else {
            image = object.images[0];
        }
        if (object.artists) {
            artist = object.artists[0].name;
        } else {
            artist = object.owner.id;
        }
        var html = '<ons-list-item tappable data-uri="' + object.uri + '">' +
                '<div class="left"><img alt="' + he.encode(object.name) + ' cover" class="list-item__thumbnail" src="' + image.url + '"></div>' +
                '<div class="center"><span class="list-item__title">' + he.encode(object.name) + '</span><span class="list-item__subtitle">' + he.encode(artist) + '</span></div>' +
                '</ons-list-item>';
        var listItem = ons.createElement(html);
        listItem.addEventListener('click', api.playTrack, false);
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
        var listItem = getListItem(item.album);
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
        var listItem = getListItem(item);
        document.getElementById('search-album-list').appendChild(listItem);
    }

    /**
     * Add a list item to the playlists
     * @param {Object} item Spotify API object
     */
    function addPlaylistItem(item) {
        var listItem = getListItem(item);
        document.getElementById('playlist-list').appendChild(listItem);
    }

    /**
     * List albums returned by the Spotify API.
     * @param  {Object} error Error object
     * @param  {Object} data  Data returned by the Spotify API
     * @return {Void}
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
     * @return {Void}
     * @see https://developer.spotify.com/web-api/search-item/
     */
    function listSearchResults(error, data) {
        if (!error) {
            data.albums.items.forEach(addSearchResultItem);
        }
    }

    /**
     * List playlists returned by the Spotify API.
     * @param  {Object} error Error object
     * @param  {Object} data  Data returned by the Spotify API
     * @return {Void}
     * @see https://developer.spotify.com/web-api/get-a-list-of-current-users-playlists/
     */
    function listPlaylists(error, data) {
        if (!error) {
            data.items.forEach(addPlaylistItem);
        }
    }

    /**
     * Load more albums.
     * @param  {Function} callback Function to call when data is returned by the API
     * @return {Void}
     */
    function loadMoreAlbums(callback) {
        infinityScrollCallback = callback;
        api.getAlbums(curAlbums.length, listAlbums);
    }

    /**
     * Function called when the home page is ready.
     * @param  {Element} page ons-page element
     * @return {Void}
     */
    function initHomePage(page) {
        page.onInfiniteScroll = loadMoreAlbums;
        albumList = document.getElementById('album-list');
        api.getAlbums(null, listAlbums);
    }

    /**
     * Load the home page template
     * @return {Void}
     */
    function loadHomePage() {
        pageNavigator.replacePage('templates/home.html', {callback: initHomePage});
    }

    /**
     * Initialize the Spotify API.
     * @param  {Object}   device           Current Spotify device
     * @param  {string}   device.device_id Device ID
     * @return {Void}
     */
    function initApi(device) {
        api.setPlayer(player);
        api.init(device, loadHomePage);
    }

    /**
     * Initialize the playback SDK.
     * @return {Void}
     */
    function initPlayer() {
        player.init(api.getToken, initApi);
    }

    /**
     * Start a new search
     * @param  {Element} page ons-page element
     * @return {Void}
     */
    function search(page) {
        var list = document.getElementById('search-album-list');
        // We need this check because for some reason this event is also triggered when we close the page.
        if (list) {
            document.getElementById('search-term').textContent = page.data.term;
            albumList.textContent = '';
            api.search(page.data.term, listSearchResults);
        }
    }

    /**
     * Display the user's playlists
     * @return {Void}
     */
    function showPlaylists() {
        var list = document.getElementById('playlist-list');
        // We need this check because for some reason this event is also triggered when we close the page.
        if (list) {
            api.getPlaylists(listPlaylists);
        }
    }

    /**
     * Load and open the search page
     * @param  {string} term Search term
     * @return {Void}
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
     * @return {Void}
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
     * Load the playlists page
     * @return {Void}
     */
    function getPlaylists() {
        pageNavigator.bringPageTop('templates/playlists.html', {callback: showPlaylists});
    }

    /**
     * Initialize the app.
     * @return {Void}
     */
    function init() {
        pageNavigator = document.getElementById('navigator');
        document.getElementById('search').addEventListener('click', getSearchTerm, false);
        document.getElementById('playlists').addEventListener('click', getPlaylists, false);
        controls.init(player);
    }

    /**
     * Function called when the app is opened from a spotslim:// URL.
     * @param  {string} url URL from which the app was opened.
     * @return {Void}
     */
    function customSchemeHandler(url) {
        api.setToken(simpleQueryString.parse(url.replace('spotslim://#', '')));
        initPlayer();
    }

    return {
        init: init,
        initPlayer: initPlayer,
        customSchemeHandler: customSchemeHandler
    };
}

var spotslim = spotslimMain();

window.onSpotifyWebPlaybackSDKReady = spotslim.initPlayer;
if (typeof ons === 'object') {
    ons.ready(spotslim.init);
} else {
    throw 'Onsen is not loaded';
}

window.handleOpenURL = spotslim.customSchemeHandler;
