/*jslint browser: true, node: true*/
/*global Spotify, window, cordova, MusicControls*/

if (typeof window !== 'object') {
    throw 'SpotSlim must be used in a browser.';
}

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
        document.getElementById('search-term').textContent = page.data.term;
        document.getElementById('search-album-list').textContent = '';
        api.search(page.data.term, listSearchResults);
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
     * Initialize the app.
     * @return {Void}
     */
    function init() {
        pageNavigator = document.getElementById('navigator');
        document.getElementById('search').addEventListener('click', getSearchTerm, false);
        controls.init(player);
    }

    /**
     * Function called when the app is opened from a spotslim:// URL.
     * @param  {string} url URL from which the app was opened.
     * @return {Void}
     */
    function customSchemeHandler(url) {
        api.setToken(simpleQueryString.parse(url.replace('spotslim://#', '')).access_token);
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
