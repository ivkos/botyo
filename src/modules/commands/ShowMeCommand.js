import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Configuration from "../../util/Configuration";
import CommandModule from "../CommandModule";
import ChatApi from "../../util/ChatApi";
import ImagesClient from "google-images";

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
        return this.getImageUrls(query)
            .then(urls => urls[0])
            .then(url => ({
                url: url
            }))
            .then(theMessage => this.api.sendMessage(theMessage, msg.threadID));
    }

    getImageUrls(query) {
        return this.imagesClient.search(query)
            .then(images => images
                .slice(0, this.imagesCount) // gets the first (this.imagesCount) images
                .map(i => i.url)
            );
    }
}
