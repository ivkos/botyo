import Promise from "bluebird";

export default class ScheduledTask {
    constructor() {
        /**
         * The running status of this task. Updated internally by the TaskScheduler.
         *
         * @type {boolean}
         * @private
         */
        this._isRunning = false;
    }

    /**
     * Returns true if the scheduled task is currently running, or false otherwise.
     *
     * @return {boolean}
     */
    isRunning() {
        return this._isRunning;
    }

    /**
     * The method that gets executed periodically or on start, depending on the module's configuration.
     *
     * @return {Promise} A promise that is used to determine if and when the task completes.
     *                   The value of this promise is ignored.
     */
    execute() {
        return Promise.reject("Not implemented");
    }
}