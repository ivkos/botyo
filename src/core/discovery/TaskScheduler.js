import { dependencies as Inject, singleton as Singleton, container as ApplicationIocContainer } from "needlepoint";
import ScheduledTask from "../../modules/ScheduledTask";
import glob from "glob";
import Configuration from "../config/Configuration";

@Singleton
@Inject(Configuration)
export default class TaskScheduler {
    constructor(config) {
        this.config = config;

        this.taskInstanceToIntervalMap = new Map();

        glob.sync("../../modules/scheduled-tasks/**/*.js", { cwd: __dirname })
            .map(fn => require(fn).default)
            .filter(clazz => clazz.prototype instanceof ScheduledTask)
            .map(clazz => {
                if (!config.isModuleEnabled(clazz.prototype)) {
                    console.info(`Scheduled task ${clazz.constructor.name} is disabled`);
                    return null;
                }

                ApplicationIocContainer.registerAsSingleton(clazz);
                return ApplicationIocContainer.resolveSingleton(clazz);
            })
            .filter(t => t !== null)
            .forEach(taskInstance => {
                this.taskInstanceToIntervalMap.set(taskInstance, undefined);
                console.log(`Discovered scheduled task ${taskInstance.constructor.name}`);
            });
    }

    start() {
        this.taskInstanceToIntervalMap.forEach((intervalObj, task, theMap) => {
            const taskShouldExecuteOnStart = this.config.getModuleConfig(task, "executeOnStart");
            const taskInterval = this.config.getModuleConfig(task, "interval");

            if (taskShouldExecuteOnStart) {
                setImmediate(() => TaskScheduler.executeTask(task));
            }

            const newIntervalObj = setInterval(() => TaskScheduler.executeTask(task), taskInterval);

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
        const taskName = taskInstance.constructor.name;

        if (taskInstance.isRunning()) {
            return console.warn(`Execution of task ${taskName} cancelled because it is currently running`);
        }

        console.log(`Executing task ${taskName}...`);

        taskInstance._isRunning = true;
        taskInstance.execute()
            .catch(err => console.error(`Execution of task ${taskName} failed`, err))
            .finally(() => {
                console.log(`Task ${taskName} finished`);
                taskInstance._isRunning = false;
            });
    }
}