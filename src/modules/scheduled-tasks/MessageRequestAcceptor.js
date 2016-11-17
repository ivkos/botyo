import { dependencies as Inject } from "needlepoint";
import ScheduledTask from "../ScheduledTask";
import Threads from "../../util/Threads";
import ChatApi from "../../util/ChatApi";
import Promise from "bluebird";

@Inject(ChatApi, Threads)
export default class MessageRequestAcceptor extends ScheduledTask {
    /**
     * @param {ChatApi} api
     * @param {Threads} threads
     */
    constructor(api, threads) {
        super();

        this.api = api;
        this.threads = threads;
    }

    execute() {
        const promises = this.threads.getThreadIds().map(id => this.api.handleMessageRequest(id, true));

        return Promise.all(promises);
    }
}