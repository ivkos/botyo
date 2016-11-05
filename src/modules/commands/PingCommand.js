import CommandModule from "../CommandModule";
import ChatApi from "../../util/ChatApi";
import { dependencies as Inject } from "needlepoint";

@Inject(ChatApi)
export default class PingCommand extends CommandModule {
    constructor(api) {
        super();

        this.api = api;
    }

    getCommand() {
        return "ping";
    }

    getDescription() {
        return "Makes the bot respond to the ping";
    }

    getUsage() {
        return "";
    }

    validate(msg, argsString) {
        return true;
    }

    execute(msg, argsString) {
        return this.api.sendMessage("pong! \ud83d\ude02", msg.threadID);
    }
}