import CommandModule from "../CommandModule";
import ChatApi from "../../util/ChatApi";
import { dependencies as Inject } from "needlepoint";

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
        return this.api.sendMessage(EmojifyCommand.emojify(text), msg.threadID);
    }

    static emojify(str) {
        return str.toLowerCase()
            .split("")
            .map(c => c.codePointAt(0) >= 97 && c.codePointAt(0) <= 122 ? String.fromCodePoint(127365 + c.codePointAt(0)) + ' ' : c)
            .map(c => c.codePointAt(0) >= 48 && c.codePointAt(0) <= 57 ? c + String.fromCodePoint(8419) : c)
            .join("");
    }
}