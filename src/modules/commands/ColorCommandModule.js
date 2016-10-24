import CommandModule from "../CommandModule";
import ChatApi from "../../util/ChatApi";
import { dependencies as Inject, singleton as Singleton } from "needlepoint";

@Singleton
@Inject(ChatApi)
export default class ColorCommandModule extends CommandModule {
    constructor(api) {
        super();

        this.api = api;
    }

    getCommand() {
        return "color";
    }

    getDescription() {
        return "Changes the chat color";
    }

    getUsage() {
        return "<hex string>";
    }

    validate(msg, argsString) {
        return argsString.match(/^#?([A-Fa-f0-9]{6})$/) !== null;
    }

    execute(msg, argsString) {
        return this.api.changeThreadColor(argsString, msg.threadID);
    }
}