import FilterModule from "../FilterModule";
import { dependencies as Inject, singleton as Singleton, container as ApplicationIocContainer } from "needlepoint";
import ChatApi from "../../util/ChatApi";
import EmojifyCommand from "../commands/EmojifyCommand";

@Singleton
@Inject(ChatApi)
export default class AutoEmojifyFilter extends FilterModule {
    constructor(api) {
        super();

        this.api = api;
    }

    filter(msg) {
        if (AutoEmojifyFilter.isEmojifiable(msg.body)) {
            this.api.sendMessage(EmojifyCommand.emojify(msg.body), msg.threadID);
        }

        return msg;
    }

    static isEmojifiable(text) {
        return text.match(/((?:[A-Z]\s){2,}[A-Z])/) !== null;
    }
}