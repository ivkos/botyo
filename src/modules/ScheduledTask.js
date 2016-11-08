export default class ScheduledTask {
    constructor() {
    }

    getInterval() {
        return 60 * 1000;
    }

    shouldRunOnStart() {
        return false;
    }

    execute() {
    }
}