import CommandModule from "../CommandModule";
import ChatApi from "../../util/ChatApi";
import { dependencies as Inject, singleton as Singleton } from "needlepoint";

@Singleton
@Inject(ChatApi)
export default class AestheticCommand extends CommandModule {
    constructor(api) {
        super();

        this.api = api;
    }

    getCommand() {
        return "ae";
    }

    getDescription() {
        return "Makes text aesthetic.";
    }

    getUsage() {
        return "<text>";
    }

    validate(msg, text) {
        return text.length > 0;
    }

    execute(msg, text) {
        return this.api.sendMessage(AestheticCommand.makeAesthetic(text), msg.threadID);
    }

    static makeAesthetic(text) {
        return text.split("")
            .map(c => {
                const codePoint = c.codePointAt(0);

                if (codePoint >= 33 && codePoint <= 270) {
                    return String.fromCharCode(codePoint + 65248);
                }

                return c;
            })
            .join("");
    }
}