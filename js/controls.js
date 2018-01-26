/*jslint browser: true*/

/**
 * controls module constructor.
 * @return {Object} controls module
 */
function spotslimPlayerControls() {
    'use strict';
    var ui = {};

    /**
     * Initialize controls module
     * @param  {Object} player Player module instance
     * @return {Void}
     */
    function init(player) {
        ui.title = document.getElementById('player-title');
        ui.progress = document.getElementById('player-progress');
        ui.next = document.getElementById('player-next');
        ui.previous = document.getElementById('player-previous');
        ui.toggle = document.getElementById('player-toggle');
        ui.toggle.icon = document.getElementById('player-toggle-icon');

        ui.next.addEventListener('click', player.nextTrack, false);
        ui.previous.addEventListener('click', player.previousTrack, false);
        ui.toggle.addEventListener('click', player.togglePlay, false);
    }

    return {
        ui: ui,
        init: init
    };
}

module.exports = spotslimPlayerControls();
