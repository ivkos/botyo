import { dependencies as Inject } from "needlepoint";
import Configuration from "./Configuration";
import * as fs from "fs";
import Promise from "bluebird";

const login = require("facebook-chat-api");

@Inject(Configuration)
export default class FacebookClient {
    constructor(config) {
        this.config = config;

        this.appStateFilePath = this.config.get("app.stateFile");
    }

    /**
     * @returns {Promise}
     */
    login() {
        return new Promise((resolve, reject) => {
            const loginOptions = this.isAppStateAvailable() ? {
                appState: JSON.parse(fs.readFileSync(this.appStateFilePath, 'utf8'))
            } : {
                email: this.config.get("account.email"),
                password: this.config.get("account.password")
            };

            login(loginOptions, (err, api) => {
                if (err) return reject(err);

                this.api = api;

                fs.writeFileSync(this.appStateFilePath, JSON.stringify(api.getAppState()));

                return resolve(api);
            });
        });
    }

    /**
     * @returns {Promise}
     */
    logout() {
        return new Promise((resolve, reject) => {
            this.api.logout(err => {
                if (err) return reject(err);

                return resolve();
            });
        })
    }

    /**
     * @returns {boolean}
     */
    isAppStateAvailable() {
        return fs.existsSync(this.appStateFilePath);
    }
}