import { singleton as Singleton, container as ApplicationIocContainer } from "needlepoint";
import ScheduledTask from "../modules/ScheduledTask";
import glob from "glob";

@Singleton
export default class TaskScheduler {
    constructor() {
        this.taskInstanceToIntervalMap = new Map();

        glob.sync("../modules/scheduled-tasks/**/*.js", { cwd: __dirname })
            .map(fn => require(fn).default)
            .filter(clazz => clazz.prototype instanceof ScheduledTask)
            .map(clazz => {
                ApplicationIocContainer.registerAsSingleton(clazz);
                return ApplicationIocContainer.resolveSingleton(clazz);
            })
            .forEach(taskInstance => {
                this.taskInstanceToIntervalMap.set(taskInstance, undefined);
                console.log(`Discovered scheduled task ${taskInstance.constructor.name}`);
            });
    }

    start() {
        this.taskInstanceToIntervalMap.forEach((intervalObj, task, theMap) => {
            if (task.shouldExecuteOnStart()) {
                setImmediate(() => TaskScheduler.executeTask(task));
            }

            const newIntervalObj = setInterval(() => TaskScheduler.executeTask(task), task.getInterval());

            theMap.set(task, newIntervalObj);
        });
    }

    stop() {
        this.taskInstanceToIntervalMap.forEach((intervalObj, task) => clearInterval(intervalObj));
    }

    /**
     * @param {ScheduledTask} taskInstance
     */
    static executeTask(taskInstance) {
        if (taskInstance.isRunning()) {
            return console.warn(`Execution of task ${taskInstance.constructor.name} cancelled because it is currently running`);
        }

        console.log(`Executing task ${taskInstance.constructor.name}...`);

        taskInstance._isRunning = true;
        taskInstance.execute()
            .catch(err => console.error(`Execution of task ${taskInstance.constructor.name} failed`, err))
            .finally(() => {
                console.log(`Task ${taskInstance.constructor.name} finished`);
                taskInstance._isRunning = false;
            });
    }
}