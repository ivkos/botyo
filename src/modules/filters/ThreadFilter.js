import FilterModule from "../FilterModule";
import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Promise from "bluebird";
import Threads from "../../core/config/Threads";

@Singleton
@Inject(Threads)
export default class ThreadFilter extends FilterModule {
    /**
     * @param {Threads} threads
     */
    constructor(threads) {
        super();

        this.threadsToListen = threads.getThreadIds();
    }

    filter(msg) {
        const threadId = parseInt(msg.threadID);
        const shouldListen = this.threadsToListen.indexOf(threadId) !== -1;

        if (shouldListen) {
            return Promise.resolve(msg);
        } else {
            return Promise.reject("Received message from thread (" + threadId + ") we're not listening to");
        }
    }
}