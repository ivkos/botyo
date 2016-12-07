import { dependencies as Inject } from "needlepoint";
import Promise from "bluebird";
import ChatApi from "./api/ChatApi";
import Configuration from "./config/Configuration";
import TerminationHandler from "./util/TerminationHandler";
import TaskScheduler from "./discovery/TaskScheduler";
import fs from "fs";
import FilterChain from "./discovery/FilterChain";

@Inject(
    Configuration,
    ChatApi,
    TerminationHandler,
    TaskScheduler,
    FilterChain
)
export default class Application {
    /**
     * @param {Configuration} config
     * @param {ChatApi} api
     * @param {TerminationHandler} terminationHandler
     * @param {TaskScheduler} taskScheduler
     * @param {FilterChain} filterChain
     */
    constructor(config, api, terminationHandler, taskScheduler, filterChain) {
        this.config = config;
        this.bannerText = fs.readFileSync(config.get("app.bannerFile"), { encoding: "utf8" });

        this.api = api;
        this.terminationHandler = terminationHandler;
        this.taskScheduler = taskScheduler;

        this.filterChain = filterChain;
    }

    start() {
        this.terminationHandler.register();
        this.taskScheduler.start();

        console.info(this.bannerText);

        return this.api.listen((err, msg) => {
            if (err) return Promise.reject(err);

            return this.filterChain.pass(msg);
        });
    }
}