import Promise from "bluebird";

export default class ScheduledTask {
    constructor() {
        this._isRunning = false;
    }

    /**
     * @return {boolean}
     */
    isRunning() {
        return this._isRunning;
    }

    /**
     * @return {Promise}
     */
    execute() {
        return Promise.reject("Not implemented");
    }
}