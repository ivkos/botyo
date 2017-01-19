import { dependencies as Inject } from "needlepoint";
import CommandModule from "../CommandModule";
import ChatApi from "../../core/api/ChatApi";

@Inject(ChatApi)
export default class LmgtfyCommand extends CommandModule {
    /**
     * @param {ChatApi} api
     */
    constructor(api) {
        super();

        this.api = api;
    }

    getCommand() {
        return "lmgtfy";
    }

    getDescription() {
        return "Googles that for you";
    }

    getUsage() {
        return "<query>"
    }

    validate(msg, argsString) {
        return argsString && argsString.length > 0;
    }

    execute(msg, argsString) {
        const url = "https://lmgtfy.com/?q=" + encodeURIComponent(argsString);

        return this.api.sendMessage(`There you go:\n\u{1F517} ${url}`, msg.threadID);
    }
}