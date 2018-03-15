import { inject, injectable } from "inversify";
import ModuleRegistry from "../../util/ioc/ModuleRegistry";
import { Logger, ScheduledTaskModule } from "botyo-api";
import * as Scheduler from "node-schedule";
import { Job } from "node-schedule";
import * as Bluebird from "bluebird";
import Timer = NodeJS.Timer;

@injectable()
export default class TaskScheduler
{
    private readonly taskToIntervalMap: Map<ScheduledTaskModule, Timer> = new Map();
    private readonly taskToCronJobMap: Map<ScheduledTaskModule, Job> = new Map();
    private readonly taskToExecutePromiseMap: Map<ScheduledTaskModule, Bluebird<any>> = new Map();
    private readonly myBluebird: typeof Bluebird;

    constructor(@inject(ModuleRegistry) private readonly registry: ModuleRegistry,
                @inject(Logger.SYMBOL) private readonly logger: Logger)
    {
        this.myBluebird = Bluebird.getNewLibraryCopy();
        this.myBluebird.config({ cancellation: true });
    }

    start()
    {
        for (let module of this.registry.getScheduledTaskModules()) {
            const taskName = module.constructor.name;

            const isEnabled = module.getRuntime().getConfiguration().isEnabled();
            if (!isEnabled) {
                this.logger.warn(`Scheduled task '${taskName}' is disabled`);
                continue;
            }

            const schedule = module.getSchedule();
            if (typeof schedule === "string") {
                const job = Scheduler.scheduleJob(schedule, () => this.runTask(module));
                this.taskToCronJobMap.set(module, job);

                this.logger.info(`Scheduled task '${taskName}' is scheduled to run according to cron '${schedule}'`);
            } else if (typeof schedule === "number") {
                const interval = setInterval(() => this.runTask(module), schedule);
                this.taskToIntervalMap.set(module, interval);

                this.logger.info(`Scheduled task '${taskName}' is scheduled to run every ${schedule} milliseconds`);
            } else {
                this.logger.warn(
                    `Scheduled task '${taskName}' will not be scheduled to run ` +
                    `because its schedule is set to '${schedule}'`
                );
            }

            if (module.shouldExecuteOnStart()) {
                setTimeout(() => this.runTask(module), 0);
            }
        }
    }

    stop()
    {
        this.taskToIntervalMap.forEach(timer => clearInterval(timer));
        this.taskToIntervalMap.clear();

        this.taskToCronJobMap.forEach(job => job.cancel());
        this.taskToCronJobMap.clear();

        this.taskToExecutePromiseMap.forEach(promise => promise.cancel());
        this.taskToExecutePromiseMap.clear();

        this.logger.info("Task scheduler has been stopped");
    }

    private async runTask(module: ScheduledTaskModule)
    {
        const taskName = module.constructor.name;

        if (this.taskToExecutePromiseMap.get(module) !== undefined) {
            this.logger.warn(
                `New run of scheduled task '${taskName}' has been cancelled ` +
                "because the task is still running. The task will attempt to run next time according to schedule. " +
                "Please consider increasing the interval since the task appears to be running longer than expected."
            );
            return;
        }

        const executePromise = this.myBluebird.try(() => module.execute());
        this.taskToExecutePromiseMap.set(module, executePromise);

        this.logger.info(`Scheduled task '${taskName}' started`);

        return executePromise
            .then(() => {
                this.logger.info(`Scheduled task '${taskName}' finished`)
            })
            .catch(err => {
                this.logger.error(`Scheduled task '${taskName}' failed`, err);
            })
            .finally(() => {
                this.taskToExecutePromiseMap.delete(module);
            });
    }
}