import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Configuration from "../core/config/Configuration";
import googl from "goo.gl";
import Promise from "bluebird";

const CONFIG_PROP = "misc.googlApiKey";
const WARN_MSG = `Your goo.gl API key is not set in config (${CONFIG_PROP}). URLs will not be shortened!`;

@Singleton
@Inject(Configuration)
export default class GooglUrlShortener {
    /**
     * @param {Configuration} config
     */
    constructor(config) {
        if (!config.has(CONFIG_PROP) || config.get(CONFIG_PROP) === "YOUR_GOOGL_API_KEY") {
            console.warn(WARN_MSG);
        } else {
            googl.setKey(config.get(CONFIG_PROP));
            this.canShorten = true;
        }
    }

    /**
     * @param {string} url URL
     * @returns {Promise.<string>} shortened URL
     */
    shorten(url) {
        if (!this.canShorten) {
            console.warn(WARN_MSG);
            return Promise.resolve(url);
        }

        return Promise.resolve(googl.shorten(url));
    }
}