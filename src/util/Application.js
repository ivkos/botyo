import { dependencies as Inject } from "needlepoint";
import Promise from "bluebird";
import ChatApi from "./ChatApi";
import Configuration from "./Configuration";
import ThreadFilter from "../modules/filters/ThreadFilter";
import TrimmingFilter from "../modules/filters/TrimmingFilter";
import CommandExecutorFilter from "../modules/filters/CommandExecutorFilter";
import AutoEmojifyFilter from "../modules/filters/AutoEmojifyFilter";
import HeIsRisenFilter from "../modules/filters/HeIsRisenFilter";
import TerminationHandler from "./TerminationHandler";
import TaskScheduler from "./TaskScheduler";
import fs from "fs";

@Inject(
    Configuration,
    ChatApi,
    TerminationHandler,
    TaskScheduler,
    ThreadFilter,
    TrimmingFilter,
    CommandExecutorFilter,
    AutoEmojifyFilter,
    HeIsRisenFilter
)
export default class Application {
    /**
     * @param {Configuration} config
     * @param {ChatApi} api
     * @param {TerminationHandler} terminationHandler
     * @param {TaskScheduler} taskScheduler
     * @param {ThreadFilter} threadFilter
     * @param {TrimmingFilter} trimmingFilter
     * @param {CommandExecutorFilter} commandExecutorFilter
     * @param {AutoEmojifyFilter} autoEmojifyFilter
     * @param {HeIsRisenFilter} heIsRisenFilter
     */
    constructor(config, api, terminationHandler, taskScheduler, threadFilter, trimmingFilter, commandExecutorFilter, autoEmojifyFilter, heIsRisenFilter) {
        this.config = config;
        this.bannerText = fs.readFileSync(config.get("app.bannerFile"), { encoding: "utf8" });

        this.api = api;
        this.terminationHandler = terminationHandler;
        this.taskScheduler = taskScheduler;

        this.threadFilter = threadFilter;
        this.trimmingFilter = trimmingFilter;
        this.commandExecutorFilter = commandExecutorFilter;
        this.autoEmojifyFilter = autoEmojifyFilter;
        this.heIsRisenFilter = heIsRisenFilter;
    }

    start() {
        console.info(this.bannerText);

        this.terminationHandler.register();
        this.taskScheduler.start();

        return this.api.listen((err, msg) => {
            if (err) return Promise.reject(err);

            return Promise.resolve(msg)
                .then(msg => this.threadFilter.filter(msg))
                .then(msg => this.trimmingFilter.filter(msg))
                .then(msg => this.commandExecutorFilter.filter(msg))
                .then(msg => this.autoEmojifyFilter.filter(msg))
                .then(msg => this.heIsRisenFilter.filter(msg));
        });
    }
}