/*jslint browser: true, node: true*/
/*global cordova, window, localStorage*/

var SpotifyWebApi = require('spotify-web-api-js'),
    simpleQueryString = require('simple-query-string');

/**
 * api module constructor.
 * @return {Object} api module
 */
function spotslimApi() {
    'use strict';

    var appId = 'b7b9dd79c3fb44f2896a676b293e1e01',
        spotify = new SpotifyWebApi(),
        myDevice,
        token,
        player;

    /**
     * Check if a token is available in the URL or in the local storage.
     * @return {Void}
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
            if (storageItem && storageItem.token && (new Date() < new Date(storageItem.expires))) {
                token = storageItem.token;
            }
        }
    }

    /**
     * Set the current Spotify token
     * @param {string} newToken New token
     */
    function setToken(newToken) {
        token = newToken;
    }

    /**
     * Set the current player module instance
     * @param {Object} newPlayer Player module instance
     */
    function setPlayer(newPlayer) {
        player = newPlayer;
    }

    /**
     * Get saved albums
     * @param  {number}   offset   Offset to start from
     * @param  {Function} callback Function to call when the API call is complete
     * @return {Void}
     * @see https://developer.spotify.com/web-api/check-users-saved-albums/
     */
    function getAlbums(offset, callback) {
        var options = {};
        if (offset) {
            options.offset = offset;
        }
        spotify.getMySavedAlbums(options, callback);
    }

    /**
     * Search albums
     * @param  {string}   term     Search term
     * @param  {Function} callback Function to call when the API call is complete
     * @return {Void}
     */
    function search(term, callback) {
        spotify.searchAlbums(term, null, callback);
    }

    /**
     * Start a new track.
     *
     * @param  {MouseEvent} e Event that triggered the function
     * @return {Void}
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
        setTimeout(player.resume, 1000);
    }

    /**
     * Redirect the user to a Spotify page that asks for a new token.
     * @return {Void}
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
     * Get a Spotify API token.
     * @param  {Function} callback Function to call when we have a token
     * @return {(string|undefined)} Token (if found)
     */
    function getToken(callback) {
        var query = simpleQueryString.parse(window.location.search);
        if (query.error && query.error === 'access_denied') {
            player.authError({message: 'Spotify access denied.'});
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
     * Function called when the playback SDK is ready so we can initialize the API.
     * @param  {Object}   device           Current Spotify device
     * @param  {string}   device.device_id Device ID
     * @param  {Function} callback         Function to call when the API is initialized
     * @return {Void}
     */
    function init(device, callback) {
        myDevice = device;
        spotify.setAccessToken(getToken());
        callback();
    }

    return {
        init: init,
        getAlbums: getAlbums,
        search: search,
        playTrack: playTrack,
        askToken: askToken,
        getToken: getToken,
        setToken: setToken,
        setPlayer: setPlayer
    };
}

module.exports = spotslimApi();
