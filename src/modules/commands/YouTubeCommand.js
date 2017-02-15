import { dependencies as Inject } from "needlepoint";
import CommandModule from "../CommandModule";
import Configuration from "../../core/config/Configuration";
import ChatApi from "../../core/api/ChatApi";
import YouTube from "youtube-api";
import Promise from "bluebird";

@Inject(Configuration, ChatApi)
export default class YouTubeCommand extends CommandModule {
    /**
     * @param {Configuration} config
     * @param {ChatApi} api
     */
    constructor(config, api) {
        super();
        this.api = api;

        YouTube.authenticate({
            type: "key",
            key: config.getModuleConfig(this, "apiKey")
        });

        this.defaultOpts = {
            part: "id,snippet",
            regionCode: config.getModuleConfig(this, "regionCode"),
            order: config.getModuleConfig(this, "order"),
            safeSearch: config.getModuleConfig(this, "safeSearch"),
            maxResults: 1 // we are only posting 1 video to the chat
        };
    }

    getCommand() {
        return "yt";
    }

    getDescription() {
        return "Posts a YouTube video in the chat"
    }

    getUsage() {
        return "<serach query>";
    }

    validate(msg, argsString) {
        return argsString && argsString.length > 0;
    }

    execute(msg, argsString) {
        return this.findVideo(argsString).then(video => {
            if (video === null) {
                return this.api.sendMessage("No results. \u{1F615}", msg.threadID);
            }

            return this.api.sendMessage({
                url: video.url,
                body: `\u{1F4FC} ${video.title}\n\u{1F517} ${video.url}`
            }, msg.threadID);
        });
    }

    findVideo(query) {
        return new Promise((resolve, reject) => {
            YouTube.search.list(this.buildOpts(query), (err, data) => {
                if (err) return reject(err);
                if (!data.items) return reject(new Error("Could not parse response"));
                if (data.items.length === 0) return resolve(null);

                const firstVideo = data.items[0];

                const video = {
                    url: this.getUrl(firstVideo.id.videoId),
                    title: firstVideo.snippet.title
                };

                return resolve(video);
            });
        });
    }

    getUrl(videoId) {
        return "https://youtu.be/" + videoId;
    }

    buildOpts(query) {
        return Object.assign({}, this.defaultOpts, {
            q: query
        });
    }
}