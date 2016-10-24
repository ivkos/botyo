import { dependencies as Inject } from "needlepoint";
import ChatApi from "./ChatApi";
import Configuration from "./Configuration";
import ThreadFilter from "../modules/filters/ThreadFilter";
import TrimmingFilter from "../modules/filters/TrimmingFilter";
import CommandExecutorFilter from "../modules/filters/CommandExecutorFilter";

@Inject(Configuration, ChatApi,
    ThreadFilter,
    TrimmingFilter,
    CommandExecutorFilter
)
export default class Application {
    /**
     * @param {Configuration} config
     * @param {ChatApi} api
     * @param {ThreadFilter} threadFilter
     * @param {TrimmingFilter} trimmingFilter
     * @param {CommandExecutorFilter} commandExecutorFilter
     */
    constructor(config, api, threadFilter, trimmingFilter, commandExecutorFilter) {
        this.config = config;
        this.api = api;

        this.threadFilter = threadFilter;
        this.trimmingFilter = trimmingFilter;
        this.commandExecutorFilter = commandExecutorFilter;
    }

    start() {
        return this.api.listen((err, msg) => {
            if (err) return Promise.reject(err);

            return Promise.resolve(msg)
                .then(msg => this.threadFilter.filter(msg))
                .then(msg => this.trimmingFilter.filter(msg))
                .then(msg => this.commandExecutorFilter.filter(msg));
        });
    }
}