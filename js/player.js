/*jslint browser: true, node: true*/
/*global Spotify, MusicControls, window, navigator*/

if (typeof window !== 'object') {
    throw 'SpotSlim must be used in a browser.';
}

var he = require('he'),
    ons = require('onsenui'),
    controls = require('./controls.js'),
    api = require('./api.js');

/**
 * player module constructor.
 * @return {Object} player module
 */
function spotslimPlayer() {
    'use strict';

    var player;

    /**
     * Display an authentication error.
     * @param  {Object} error         Error object
     * @param  {string} error.message Error message
     * @return {Void}
     */
    function authError(error) {
        ons.notification.confirm({
            message: error.message,
            title: 'Error',
            buttonLabels: ['Cancel', 'Retry'],
            callback: api.askToken
        });
    }

    /**
     * Display a playback error.
     * @param  {Object} error         Error object
     * @param  {string} error.message Error message
     * @return {Void}
     */
    function playbackError(error) {
        ons.notification.alert({
            message: error.message,
            title: 'Error',
            cancelable: true
        });
    }

    /**
     * Resume playback.
     * @return {Void}
     */
    function resume() {
        player.resume();
    }

    /**
     * Go to the next track in the album.
     * @return {Void}
     */
    function nextTrack() {
        player.nextTrack().then(resume);
    }

    /**
     * Go to the previous track in the album.
     * @return {Void}
     */
    function previousTrack() {
        player.previousTrack().then(resume);
    }

    /**
     * Only toggle playback if the player has a current state.
     * @param  {Object} state Current state of the player
     * @return {Void}
     */
    function doToggle(state) {
        if (state) {
            player.togglePlay();
        }
    }

    /**
     * Resume/pause playback.
     * @return {Void}
     */
    function togglePlay() {
        player.getCurrentState().then(doToggle);
    }

    /**
     * Function called when an event is triggered by the music controls plugin.
     * @param  {string} action JSON string containing info about the event
     * @return {Void}
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
     * @return {Void}
     * @see https://beta.developer.spotify.com/documentation/web-playback-sdk/reference/#event-player-state-changed
     */
    function updatePlayer(playbackState) {
        if (playbackState) {
            var isPlaying;
            controls.ui.title.innerHTML = he.encode(playbackState.track_window.current_track.name) + '<br/>' + he.encode(playbackState.track_window.current_track.artists[0].name);
            controls.ui.progress.value = (playbackState.position / playbackState.duration) * 100;
            controls.ui.previous.disabled = false;
            controls.ui.next.disabled = false;
            controls.ui.toggle.disabled = false;
            if (playbackState.paused) {
                isPlaying = false;
                controls.ui.toggle.setAttribute('icon', 'fa-play');
            } else {
                isPlaying = true;
                controls.ui.toggle.setAttribute('icon', 'fa-pause');
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
     * @param {Function} tokenFunction Function that returns a Spotify API token
     * @param {Function} callback      Function called when the playback SDK is ready
     * @return {Void}
     */
    function init(tokenFunction, callback) {
        player = new Spotify.Player({
            name: 'SpotSlim',
            getOAuthToken: tokenFunction
        });

        player.on('ready', callback);
        player.on('player_state_changed', updatePlayer);
        player.on('authentication_error', authError);
        player.on('account_error', authError);
        player.on('initialization_error', authError);
        player.on('playback_error', playbackError);

        player.connect();
    }

    return {
        init: init,
        resume: resume,
        nextTrack: nextTrack,
        previousTrack: previousTrack,
        togglePlay: togglePlay,
        authError: authError
    };
}

module.exports = spotslimPlayer();
