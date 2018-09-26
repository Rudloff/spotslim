# SpotSlim

SpotSlim is an open source Spotify client written with web technologies.

It uses the [Spotify Web API](https://developer.spotify.com/web-api/)
and the [Web Playback SDK](https://beta.developer.spotify.com/documentation/web-playback-sdk/).

## Setup

You need to use [Yarn](https://yarnpkg.com/) to install the dependencies:

```bash
yarn
```

## Requirements

* The app must be served over HTTPS for Encrypted Media Extensions to work correctly.
* You need a Spotify Premium account.
* If you host the app yourself,
    you need to generate an app ID on the [Spotify Dashboard](https://beta.developer.spotify.com/dashboard/applications)
    and set it in `js/api.js`.

## Proprietary libs

Unfortunately, we have to use the `spotify-player.js` library which is not open source.
All the code in this repository is free though.

## "Failed to initialize player" error

If you get this error, it probably means that your browser can't play DRM content.
If you are using Firefox or Chrome,
you need [Widevine](https://www.widevine.com/) to be installed and enabled.
