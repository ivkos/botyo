import CommandModule from "../CommandModule";
import ChatApi from "../../util/ChatApi";
import { dependencies as Inject } from "needlepoint";
import Bro from "brototype";

@Inject(ChatApi)
export default class StatsCommand extends CommandModule {
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
            const bro = new Bro(info);

            let result = "";

            if (bro.doYouEven("emoji.emoji")) {
                result += info.emoji.emoji;
            } else {
                result += "\u{1F518}";
            }

            if (bro.doYouEven("name")) {
                result += " " + info.name + "\n";
            }

            if (bro.doYouEven("participantIDs.length")) {
                result += "\u{1F465} " + info.participantIDs.length + " participants\n";
            }

            if (bro.doYouEven("messageCount")) {
                result += "\u{1F4DD} " + info.messageCount + " messages\n";
            }

            return this.api.sendMessage(result, msg.threadID);
        });
    }
}