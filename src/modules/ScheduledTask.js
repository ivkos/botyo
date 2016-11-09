import Promise from "bluebird";

export default class ScheduledTask {
    constructor() {
        this._isRunning = false;
    }

    /**
     * @return {number}
     */
    getInterval() {
        return 60 * 1000;
    }

    /**
     * @return {boolean}
     */
    shouldExecuteOnStart() {
        return false;
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