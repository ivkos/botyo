import FilterModule from "../FilterModule";
import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import ChatApi from "../../util/ChatApi";
import Emojify from "../../util/Emojify";

const emojifiablePattern = /\b((?:[A-Z]\s){2,}[A-Z])\b/g;

@Singleton
@Inject(ChatApi)
export default class AutoEmojifyFilter extends FilterModule {
    constructor(api) {
        super();

        this.api = api;
    }

    filter(msg) {
        if (!msg.body) return msg;

        if (AutoEmojifyFilter.shouldEmojify(msg.body)) {
            const response = msg.body.replace(emojifiablePattern, match => Emojify.emojify(match));

            this.api.sendMessage(response, msg.threadID);
        }

        return msg;
    }

    static shouldEmojify(text) {
        return text.match(emojifiablePattern) !== null;
    }
}