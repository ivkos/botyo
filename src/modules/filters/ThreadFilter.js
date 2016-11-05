import FilterModule from "../FilterModule";
import Configuration from "../../util/Configuration";
import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Promise from "bluebird";
import Bro from "brototype";

@Singleton
@Inject(Configuration)
export default class ThreadFilter extends FilterModule {
    /**
     * @param {Configuration} config
     */
    constructor(config) {
        super();

        this.config = config;

        this.threadsToListen = this.config.get("threads");
    }

    filter(msg) {
        const threadId = parseInt(msg.threadID);

        const shouldListen = this.threadsToListen.some(t => {
            // simple threadId without aliases or other properties
            if (t == threadId)
                return true;

            // threadId object with properties
            const id = parseInt(new Bro(t).giveMeProps()[0]);

            return threadId == id;
        });

        if (shouldListen) {
            return Promise.resolve(msg);
        } else {
            return Promise.reject("Received message from thread (" + threadId + ") we're not listening to");
        }
    }
}