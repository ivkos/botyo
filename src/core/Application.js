import { dependencies as Inject, container as ApplicationIocContainer } from "needlepoint";
import Promise from "bluebird";
import ChatApi from "./api/ChatApi";
import Configuration from "./config/Configuration";
import TerminationHandler from "./util/TerminationHandler";
import TaskScheduler from "./discovery/TaskScheduler";
import fs from "fs";
import FilterChain from "./discovery/FilterChain";
import AsyncResolver from "./discovery/AsyncResolver";
import MongoConnector from "./db/MongoConnector";
import FacebookClient from "./api/FacebookClient";

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

    static initialize() {
        return AsyncResolver
            .resolve(
                MongoConnector,
                FacebookClient
            )
            .then(() => ApplicationIocContainer.resolve(Application))
            .then(app => app.start())
            .catch(err => console.error(err));
    }
}