import { inject, injectable } from "inversify";
import { CommandModule, FilterModule, Logger, Module, ScheduledTaskModule } from "botyo-api";
import TypeUtils from "../TypeUtils";

@injectable()
export default class ModuleRegistry
{
    private readonly commandModules: CommandModule[] = [];
    private readonly filterModules: FilterModule[] = [];
    private readonly scheduledTaskModules: ScheduledTaskModule[] = [];

    constructor(@inject(Logger.SYMBOL) private readonly logger: Logger) {}

    getCommandModules(): CommandModule[]
    {
        return this.commandModules;
    }

    getFilterModules(): FilterModule[]
    {
        return this.filterModules;
    }

    getScheduledTaskModules(): ScheduledTaskModule[]
    {
        return this.scheduledTaskModules;
    }

    getModules(): Module[]
    {
        return ([] as Module[])
            .concat(this.commandModules)
            .concat(this.filterModules)
            .concat(this.scheduledTaskModules);
    }

    register(module: Module): void
    {
        if (!TypeUtils.isModule(module)) {
            throw new Error("This is not a module");
        }

        if (TypeUtils.isCommandModule(module)) {
            return this.registerCommandModule(module);
        }

        if (TypeUtils.isFilterModule(module)) {
            return this.registerFilterModule(module);
        }

        if (TypeUtils.isScheduledTaskModule(module)) {
            return this.registerScheduledTaskModule(module);
        }
    }

    private registerScheduledTaskModule(module: ScheduledTaskModule): void
    {
        this.scheduledTaskModules.push(module);
        this.logger.info(`Registered scheduled task module '${module.constructor.name}'`);
    }

    private registerFilterModule(module: FilterModule): void
    {
        this.filterModules.push(module);
        this.logger.info(`Registered filter module '${module.constructor.name}'`);
    }

    private registerCommandModule(module: CommandModule): void
    {
        this.commandModules.push(module);
        this.logger.info(`Registered command module '${module.constructor.name}'`);
    }
}