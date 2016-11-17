import CommandModule from "../CommandModule";
import ChatApi from "../../util/ChatApi";
import { dependencies as Inject } from "needlepoint";
import Emojify from "../../util/Emojify";

@Inject(ChatApi)
export default class EmojifyCommand extends CommandModule {
    constructor(api) {
        super();

        this.api = api;
    }

    getCommand() {
        return "emojify";
    }

    getDescription() {
        return "Returns the text emojified";
    }

    getUsage() {
        return "<text>";
    }

    validate(msg, text) {
        return text.length > 0;
    }

    execute(msg, text) {
        return this.api.sendMessage(Emojify.emojify(text), msg.threadID);
    }
}