import FilterModule from "../FilterModule";
import Configuration from "../../util/Configuration";
import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Promise from "bluebird";

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
        if (this.threadsToListen.indexOf(parseInt(msg.threadID)) != -1) {
            return Promise.resolve(msg);
        } else {
            return Promise.reject("Received message from thread (" + msg.threadID + ") we're not listening to");
        }
    }
}