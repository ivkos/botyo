import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import FacebookClient from "../api/FacebookClient";
import MongoConnector from "../db/MongoConnector";
import Promise from "bluebird";
import npid from "npid";
import TaskScheduler from "../discovery/TaskScheduler";

@Singleton
@Inject(FacebookClient, MongoConnector, TaskScheduler)
export default class TerminationHandler {
    /**
     * @param {FacebookClient} facebookClient
     * @param {MongoConnector} mongoConnector
     * @param {TaskScheduler} taskScheduler
     * @constructor
     */
    constructor(facebookClient, mongoConnector, taskScheduler) {
        this.facebookClient = facebookClient;
        this.mongoConnector = mongoConnector;
        this.taskScheduler = taskScheduler;
    }

    register() {
        console.log("Registered TerminationHandler");

        process.on('SIGTERM', () => this.terminate());
        process.on('SIGINT', () => this.terminate());
        process.on('SIGHUP', () => this.terminate());

        try {
            const pid = npid.create('app.pid');
            pid.removeOnExit();
        } catch (err) {
            console.warn("Could not create pid file", err);
        }
    }

    terminate() {
        console.log("Shutting down...");

        return Promise.all([
            this.terminateFacebookClient(),
            this.terminateMongoConnector(),
            this.terminateTaskScheduler()
        ]).finally(() => {
            console.log("Goodbye!");
            process.exit();
        });
    }

    terminateFacebookClient() {
        if (this.facebookClient.isAppStateAvailable()) {
            return;
        }

        return this.facebookClient.logout();
    }

    terminateMongoConnector() {
        return this.mongoConnector.disconnect();
    }

    terminateTaskScheduler() {
        return this.taskScheduler.stop();
    }
}