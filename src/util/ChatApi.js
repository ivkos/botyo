import Promise from "bluebird";
import { singleton as Singleton } from "needlepoint";

@Singleton
export default class ChatApi {
    constructor(api) {
        this.api = api;

        this.api.setOptions({
            logLevel: "warn"
        });
    }

    listen(callback) {
        return this.api.listen(callback);
    }

    sendMessage(message, threadId) {
        return Promise.promisify(this.api.sendMessage)(message, threadId);
    }

    changeThreadColor(color, threadId) {
        return Promise.promisify(this.api.changeThreadColor)(color, threadId);
    }

    getThreadInfo(threadId) {
        return Promise.promisify(this.api.getThreadInfo)(threadId);
    }

    getThreadHistory(threadId, start, end, timestamp) {
        return Promise.promisify(this.api.getThreadHistory)(threadId, start, end, timestamp);
    }

    sendTypingIndicator(threadId, callback) {
        return this.api.sendTypingIndicator(threadId, callback);
    }

    markAsRead(threadId) {
        return Promise.promisify(this.api.markAsRead)(threadId);
    }

    getUserInfo(ids) {
        return Promise.promisify(this.api.getUserInfo)(ids);
    }

    getCurrentUserId() {
        return this.api.getCurrentUserID();
    }
}