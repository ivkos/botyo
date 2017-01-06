import { dependencies as Inject } from "needlepoint";
import CommandModule from "../CommandModule";
import ChatApi from "../../core/api/ChatApi";
import Promise from "bluebird";
import request from "request";

@Inject(ChatApi)
export default class KanyeCommand extends CommandModule {
    /**
     * @param {ChatApi} api
     */
    constructor(api) {
        super();
        this.api = api;
    }

    getCommand() {
        return "kanye";
    }

    getDescription() {
        return "Responds with a Kanye West quote";
    }

    getUsage() {
        return "";
    }

    validate(msg, argsString) {
        return true;
    }

    execute(msg, argsString) {
        return Promise.all([
            KanyeCommand.getQuote(),
            KanyeCommand.getImageUrl()
        ]).then(([quote, imageUrl]) => {
            const body = "“" + quote + "”" + "\n"
                + "– Kanye West";

            return this.api.sendMessage({
                body: body,
                url: imageUrl
            }, msg.threadID);
        });
    }

    /**
     * @return {Promise.<string>} random Kanye West quote
     */
    static getQuote() {
        return new Promise((resolve, reject) => request.get("https://yepi.io/api/quote", (err, res, body) => {
            if (err) return reject(err);
            return resolve(body);
        }));
    }

    /**
     * @return {Promise.<string>} random Kanye West image URL
     */
    static getImageUrl() {
        return new Promise((resolve, reject) => request.get("https://yepi.io/api/image", (err, res, body) => {
            if (err) return reject(err);
            return resolve(body);
        }));
    }
}