import { dependencies as Inject } from "needlepoint";
import FacebookClient from "./FacebookClient";
import MongoConnector from "./persistence/MongoConnector";
import Promise from "bluebird";
import npid from "npid";

@Inject(FacebookClient, MongoConnector)
export default class TerminationHandler {
    /**
     * @param {FacebookClient} facebookClient
     * @param {MongoConnector} mongoConnector
     */
    constructor(facebookClient, mongoConnector) {
        this.facebookClient = facebookClient;
        this.mongoConnector = mongoConnector;
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
            this.terminateMongoConnector()
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
}