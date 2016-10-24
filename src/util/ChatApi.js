import Promise from "bluebird";
import { singleton as Singleton } from "needlepoint";

@Singleton
export default class ChatApi {
    constructor(api) {
        this.api = api;
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
}