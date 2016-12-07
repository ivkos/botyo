import CommandModule from "../CommandModule";
import ChatApi from "../../util/ChatApi";
import { dependencies as Inject } from "needlepoint";
import Configuration from "../../util/Configuration";
import Promise from "bluebird";
import googl from "goo.gl";

@Inject(Configuration, ChatApi)
export default class WhoDisCommand extends CommandModule {
    constructor(config, api) {
        super();

        this.config = config;
        this.api = api;

        this.recentMessagesCount = config.getModuleConfig(this, "recentMessagesCount");

        googl.setKey(config.getModuleConfig(this, "googlApiKey"));
    }

    getCommand() {
        return "whodis";
    }

    getDescription() {
        return "Runs a reverse image search on the last picture";
    }

    getUsage() {
        return "";
    }

    validate(msg, argsString) {
        return true;
    }

    execute(msg, argsString) {
        let endTypingIndicator = () => {};

        return this.api
            .markAsRead(msg.threadID)
            .then(() => this.api.sendTypingIndicator(msg.threadID))
            .then(endFn => endTypingIndicator = endFn)
            .catch(err => {
                console.warn(err);
                return Promise.resolve();
            })
            .then(() => this.api.getThreadHistory(msg.threadID, 0, this.recentMessagesCount))
            .then(history => this.getLastPhotoUrl(msg, history))
            .catch(err => {
                this.api.sendMessage("Sorry, something went wrong. \u{1F615}", msg.threadID);
                throw err;
            })
            .then(url => WhoDisCommand.getResultWithShortUrls(url))
            .then(resultText => this.api.sendMessage(resultText, msg.threadID))
            .finally(() => {
                endTypingIndicator();
            });
    }

    /**
     * @param {*} msgCtx
     * @param {Array.<*>} history
     * @return {string}
     * @private
     */
    getLastPhotoUrl(msgCtx, history) {
        const photos = history
            .filter(m => m.attachments.length > 0)
            .filter(m => m.attachments.every(a => a.type == "photo"))
            .sort((m1, m2) => m2.timestamp - m1.timestamp);

        if (photos.length == 0) {
            this.api.sendMessage("??? \uD83D\uDC68\uD83C\uDFFF ???\n\n" +
                "No photos found within the last " + this.recentMessagesCount + " messages.",
                msgCtx.threadID
            );

            return Promise.reject(new Error("No photos found"));
        }

        const lastPhoto = photos[0].attachments[0];
        const url = lastPhoto.hiresUrl || lastPhoto.previewUrl || lastPhoto.thumbnailUrl;

        if (!url) return Promise.reject(new Error("Could not get photo's URL"));

        return url;
    }

    /**
     * @param {string} url
     * @return {Promise.<string>}
     * @private
     */
    static getResultWithShortUrls(url) {
        return Promise.all([
            googl.shorten(WhoDisCommand.getGoogleUrl(url)),
            googl.shorten(WhoDisCommand.getBingUrl(url)),
            googl.shorten(WhoDisCommand.getTinEyeUrl(url))
        ]).then(result => {
            const googleShortUrl = result[0];
            const bingShortUrl = result[1];
            const tinEyeShortUrl = result[2];

            let text = "\u{1F50D} Reverse image search:\n\n";
            text += "\u{1F516} Google: " + googleShortUrl + " \n";
            text += "\u{1F516} Bing: " + bingShortUrl + " \n";
            text += "\u{1F516} TinEye: " + tinEyeShortUrl;

            return text;
        });
    }

    /**
     * @param {string} url
     * @return {string}
     * @private
     */
    static getGoogleUrl(url) {
        return "https://images.google.com/searchbyimage?image_url=" + encodeURIComponent(url);
    }

    /**
     * @param {string} url
     * @return {string}
     * @private
     */
    static getBingUrl(url) {
        return "https://www.bing.com/images/search?q=imgurl:"
            + encodeURIComponent(url)
            + "&view=detailv2&selectedIndex=0&pageurl=&mode=ImageViewer&iss=sbi";
    }

    /**
     * @param {string} url
     * @return {string}
     * @private
     */
    static getTinEyeUrl(url) {
        return "https://tineye.com/search?url=" + encodeURIComponent(url);
    }
}