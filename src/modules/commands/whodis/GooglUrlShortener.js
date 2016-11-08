import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import googl from "goo.gl";
import Configuration from "../../../util/Configuration";

@Singleton
@Inject(Configuration)
export default class GooglUrlShortener {
    constructor(config) {
        this.config = config;

        googl.setKey(this.config.get("modules.whodis.googlApiKey"));
    }

    shorten(url) {
        return googl.shorten(url);
    }
}