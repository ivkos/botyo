import CommandModule from "../CommandModule";
import ChatApi from "../../util/ChatApi";
import { dependencies as Inject } from "needlepoint";

@Inject(ChatApi)
export default class StatsCommandModule extends CommandModule {
    constructor(api) {
        super();

        this.api = api;
    }

    getCommand() {
        return "stats";
    }

    getDescription() {
        return "Returns some stats for the chat";
    }

    getUsage() {
        return "";
    }

    validate(msg, argsString) {
        return true;
    }

    execute(msg, argsString) {
        return this.api.getThreadInfo(msg.threadID).then(info => {
            let result = info.emoji.emoji || "\u{1F518}";
            result += " " + info.name + "\n";
            result += "\u{1F465} " + info.participantIDs.length + " participants\n";
            result += "\u{1F4DD} " + info.messageCount + " messages";

            return this.api.sendMessage(result, msg.threadID);
        });
    }
}