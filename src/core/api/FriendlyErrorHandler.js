import { container as Container } from "needlepoint";
import ChatApi from "./ChatApi";

export default class FriendlyErrorHandler {
    /**
     * @returns {ChatApi}
     * @private
     */
    static getChatApi() {
        return Container.resolve(ChatApi);
    }

    /**
     * @param {*} err The error
     * @param {{}} incomingMsgObj The incoming msg object, required so that the calling chat thread gets a reply
     *                            something was wrong
     * @param {string=} chatReplyMsg Message to send to the chat when something goes wrong
     */
    static handle(err, incomingMsgObj, chatReplyMsg = "Sorry, something went wrong. \u{1F615}") {
        if (!err) return;

        if (!incomingMsgObj) {
            console.warn(`${this.constructor.name}: incomingMsgObj is missing`);
            throw err;
        }

        if (!incomingMsgObj.threadID) {
            console.warn(`${this.constructor.name}: incomingMsgObj.threadID is missing`);
            throw err;
        }

        if (!err._friendlyHandled) {
            this.getChatApi().sendMessage(chatReplyMsg, incomingMsgObj.threadID);
            err._friendlyHandled = true;
            throw err;
        }
    }
}