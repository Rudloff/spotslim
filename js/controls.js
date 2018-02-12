/*jslint browser: true*/

/**
 * controls module constructor.
 * @return {Object} controls module
 */
function spotslimPlayerControls() {
    'use strict';
    var ui = {},
        player;

    /**
     * Handle keyboard events
     * @param  {KeyboardEvent} e Event that triggered the function
     * @return {Void}
     */
    function keydown(e) {
        if (e.keyCode === 32) {
            player.togglePlay();
        }
    }

    /**
     * Initialize controls module
     * @param  {Object} newPlayer Player module instance
     * @return {Void}
     */
    function init(newPlayer) {
        player = newPlayer;

        ui.title = document.getElementById('player-title');
        ui.progress = document.getElementById('player-progress');
        ui.next = document.getElementById('player-next');
        ui.previous = document.getElementById('player-previous');
        ui.toggle = document.getElementById('player-toggle');

        ui.next.addEventListener('click', player.nextTrack, false);
        ui.previous.addEventListener('click', player.previousTrack, false);
        ui.toggle.addEventListener('click', player.togglePlay, false);

        document.addEventListener('keydown', keydown, false);
    }

    return {
        ui: ui,
        init: init
    };
}

module.exports = spotslimPlayerControls();
