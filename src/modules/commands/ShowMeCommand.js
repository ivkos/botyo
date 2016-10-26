import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Configuration from "../../util/Configuration";
import CommandModule from "../CommandModule";
import ChatApi from "../../util/ChatApi";
import ImagesClient from "google-images";
import Promise from "bluebird";

@Singleton
@Inject(Configuration, ChatApi)
export default class ShowMeCommand extends CommandModule {
    constructor(config, api) {
        super();

        this.config = config;
        this.api = api;

        this.imagesCount = this.config.get("modules.showme.imagesCount");
        this.imagesClient = new ImagesClient(
            this.config.get("modules.showme.cseId"),
            this.config.get("modules.showme.cseApiKey")
        );
    }

    getCommand() {
        return "showme";
    }

    getDescription() {
        return "Returns the first few images found in Google Images matching the query";
    }

    getUsage() {
        return "<query>";
    }

    validate(msg, argsString) {
        return argsString.length > 0;
    }

    execute(msg, query) {
        let endFn;

        return new Promise(resolve => {
            endFn = this.api.sendTypingIndicator(msg.threadID, () => resolve())
        })
            .then(() => this.getImageUrls(query))
            .then(urls => {
                console.log("URLs", urls);

                const first = urls[0];
                console.log("Sending: " + first);

                return first;
            })
            .then(url => ({
                url: url
            }))
            .then(theMessage => this.api.sendMessage(theMessage, msg.threadID))
            .catch(err => {
                if (err.error && err.error == "Invalid url") {
                    return this.api.sendMessage("Sorry, Facebook doesn't like this picture. \u{1F61E}", msg.threadID);
                }

                throw err;
            })
            .finally(() => {
                if (typeof endFn == "function") {
                    endFn();
                }
            });
    }

    getImageUrls(query) {
        return this.imagesClient.search(query)
            .then(images => images
                .slice(0, this.imagesCount) // gets the first (this.imagesCount) images
                .map(i => i.url)
            );
    }
}
