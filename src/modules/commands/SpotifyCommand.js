import { dependencies as Inject } from "needlepoint";
import CommandModule from "../CommandModule";
import ChatApi from "../../core/api/ChatApi";
import Configuration from "../../core/config/Configuration";
import Spotify from "spotify-web-api-node";
import bro from "brototype";
import GooglUrlShortener from "../../util/GooglUrlShortener";
import Promise from "bluebird";

@Inject(Configuration, ChatApi, GooglUrlShortener)
export default class SpotifyCommand extends CommandModule {
    /**
     * @param {Configuration} config
     * @param {ChatApi} api
     * @param {GooglUrlShortener} googl
     */
    constructor(config, api, googl) {
        super();

        this.config = config;
        this.api = api;
        this.googl = googl;

        this.spotify = new Spotify();
        this.market = config.getModuleConfig(this, "market");
    }

    getCommand() {
        return "spotify";
    }

    getDescription() {
        return "Posts a Spotify track in the chat";
    }

    getUsage() {
        return "<track>"
    }

    validate(msg, argsString) {
        return argsString && argsString.length > 0;
    }

    execute(msg, argsString) {
        return Promise.resolve(this.spotify.searchTracks(argsString, { market: this.market, limit: 1 }))
            .then(data => {
                if (bro(data.body).doYouEven("tracks.items.0")) {
                    const track = data.body.tracks.items[0];
                    const trackUrl = bro(track).iCanHaz("external_urls.spotify");
                    if (!trackUrl) throw new Error("Could not get track URL");

                    return [track, trackUrl];
                } else {
                    throw new Error("Could not parse Spotify response");
                }
            })
            .then(([track, trackUrl]) => [track, trackUrl, this.googl.shorten(trackUrl)])
            .all()
            .then(([track, trackUrl, shortTrackUrl]) => this.api.sendMessage({
                url: trackUrl,
                body: `\u{1F3B5} ${track.name}\n\u{1F517} Play now: ${shortTrackUrl}`
            }, msg.threadID));
    }
}