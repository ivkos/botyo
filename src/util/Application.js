import { dependencies as Inject } from "needlepoint";
import Promise from "bluebird";
import ChatApi from "./ChatApi";
import Configuration from "./Configuration";
import ThreadFilter from "../modules/filters/ThreadFilter";
import TrimmingFilter from "../modules/filters/TrimmingFilter";
import CommandExecutorFilter from "../modules/filters/CommandExecutorFilter";
import AutoEmojifyFilter from "../modules/filters/AutoEmojifyFilter";

@Inject(Configuration, ChatApi,
    ThreadFilter,
    TrimmingFilter,
    CommandExecutorFilter,
    AutoEmojifyFilter
)
export default class Application {
    /**
     * @param {Configuration} config
     * @param {ChatApi} api
     * @param {ThreadFilter} threadFilter
     * @param {TrimmingFilter} trimmingFilter
     * @param {CommandExecutorFilter} commandExecutorFilter
     * @param {AutoEmojifyFilter} autoEmojifyFilter
     */
    constructor(config, api, threadFilter, trimmingFilter, commandExecutorFilter, autoEmojifyFilter) {
        this.config = config;
        this.api = api;

        this.threadFilter = threadFilter;
        this.trimmingFilter = trimmingFilter;
        this.commandExecutorFilter = commandExecutorFilter;
        this.autoEmojifyFilter = autoEmojifyFilter;
    }

    start() {
        return this.api.listen((err, msg) => {
            if (err) return Promise.reject(err);

            return Promise.resolve(msg)
                .then(msg => this.threadFilter.filter(msg))
                .then(msg => this.trimmingFilter.filter(msg))
                .then(msg => this.commandExecutorFilter.filter(msg))
                .then(msg => this.autoEmojifyFilter.filter(msg));
        });
    }
}