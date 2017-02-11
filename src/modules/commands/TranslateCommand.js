import { dependencies as Inject } from "needlepoint";
import CommandModule from "../CommandModule";
import ChatApi from "../../core/api/ChatApi";
import Configuration from "../../core/config/Configuration";
import translate from "google-translate-api";
import Promise from "bluebird";

@Inject(ChatApi, Configuration)
export default class TranslateCommand extends CommandModule {
    /**
     * @param {ChatApi} api
     * @param {Configuration} config
     */
    constructor(api, config) {
        super();

        this.api = api;

        this.defaultToLanguage = config.getModuleConfig(this, "defaultToLanguage");
        this.validationPattern = /^(?:\(((\w{2,}):)?(\w{2,})\)\s+)?(.+)$/i;
    }

    getCommand() {
        return "translate";
    }

    getDescription() {
        return "Translates text";
    }

    getUsage() {
        return "[([from:]to)] <text>, \n" +
            "e.g.: (en:fr) Hello!\n" +
            "e.g.: (fr) Hello!\n" +
            "e.g.: Bonjour!"
    }

    validate(msg, argsString) {
        return this.validationPattern.test(argsString);
    }

    execute(msg, argsString) {
        const args = this.parseArgs(argsString);

        return Promise
            .resolve(translate(args.text, { from: args.from, to: args.to }))
            .then(result => result.text)
            .then(text => "\u{1F30E} " + text) // add globe emoji
            .then(text => this.api.sendMessage(text, msg.threadID));
    }

    parseArgs(argsString) {
        const matches = argsString.match(this.validationPattern);

        return {
            from: matches[2] || "auto",
            to: matches[3] || this.defaultToLanguage,
            text: matches[4]
        };
    }
}