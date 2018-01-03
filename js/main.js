/*jslint browser: true*/
/*global SpotifyWebApi, Spotify, window, ons*/

var spotslim = (function () {
    'use strict';
    if (typeof SpotifyWebApi !== 'function') {
        throw 'spotify-web-api-js is not loaded.';
    }

    var spotify = new SpotifyWebApi();
    var myDevice;
    var curTracks;

    function getToken(callback) {
        var token = window.location.hash.substr(1).split('&')[0].split('=')[1];
        if (token) {
            if (callback) {
                callback(token);
            }
            return token;
        }
        window.location = 'https://accounts.spotify.com/authorize/?client_id=b7b9dd79c3fb44f2896a676b293e1e01&redirect_uri=' + window.location + '&response_type=token&scope=streaming%20user-read-birthdate%20user-read-email%20user-read-private%20user-library-read';
    }

    function playTrack(e) {
        spotify.play(
            {
                uris: [e.target.parentNode.dataset.uri],
                device_id: myDevice.device_id
            }
        );
    }

    function countTracks() {
        return curTracks.length;
    }

    function addTrackItem(i) {
        var item = ons.createElement('<ons-list-item tappable data-uri="' + curTracks[i].track.uri + '">' + curTracks[i].track.name + '</ons-list-item>');
        item.addEventListener('click', playTrack, false);
        return item;
    }

    function listTracks(error, data) {
        if (!error) {
            curTracks = data.items;
            var infiniteList = document.getElementById('infinite-list');

            infiniteList.delegate = {
                createItemContent: addTrackItem,
                countItems: countTracks
            };

            infiniteList.refresh();
        }
    }

    function initApi(device) {
        myDevice = device;
        spotify.setAccessToken(getToken());
        spotify.getMySavedTracks(null, listTracks);
    }

    function updatePlayer(playbackState) {
        document.getElementById('player-title').textContent = playbackState.track_window.current_track.name + ' - ' + playbackState.track_window.current_track.artists[0].name;
    }

    function initPlayer() {
        var player = new Spotify.Player({
            name: 'SpotSlim',
            getOAuthToken: getToken
        });

        player.on('ready', initApi);
        player.on('player_state_changed', updatePlayer);

        player.connect();
    }

    function init() {
        window.onSpotifyWebPlaybackSDKReady = initPlayer;
    }

    return {
        init: init
    };
}());

if (typeof ons === 'object') {
    ons.ready(spotslim.init);
} else {
    throw 'Onsen is not loaded';
}
