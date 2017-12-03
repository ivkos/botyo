import { inject, injectable } from "inversify";
import { CommandModule, FilterModule, Logger, Module, ScheduledTaskModule } from "botyo-api";
import { LoggerInstance } from "winston";
import TypeUtils from "../TypeUtils";

@injectable()
export default class ModuleRegistry
{
    private readonly commandModules: CommandModule[] = [];
    private readonly filterModules: FilterModule[] = [];
    private readonly scheduledTaskModules: ScheduledTaskModule[] = [];
    private readonly commandToCommandModuleMap: Map<string, CommandModule> = new Map();

    constructor(@inject(Logger) private readonly logger: LoggerInstance) {}

    getCommandModules(): CommandModule[]
    {
        return this.commandModules;
    }

    getCommandToCommandModuleMap(): Map<string, CommandModule>
    {
        return this.commandToCommandModuleMap;
    }

    getFilterModules(): FilterModule[]
    {
        return this.filterModules;
    }

    getScheduledTaskModules(): ScheduledTaskModule[]
    {
        return this.scheduledTaskModules;
    }

    register(module: Module)
    {
        if (TypeUtils.likeInstanceOf(module, CommandModule)) {
            const command: string = (module as CommandModule).getCommand();
            const previouslyRegisteredCommandModule = this.commandToCommandModuleMap.get(command);

            if (previouslyRegisteredCommandModule !== undefined) {
                throw new Error(`Module '${module.constructor.name}' is trying to register command '${command}' ` +
                    `that is already registered by '${previouslyRegisteredCommandModule.constructor.name}'`);
            }

            this.commandToCommandModuleMap.set(command, module as CommandModule);
            this.commandModules.push(module as CommandModule);

            this.logger.info(
                `Registered module '${module.constructor.name}' ` +
                `handling command '${(module as CommandModule).getCommand()}'`
            );
            return;
        }

        if (TypeUtils.likeInstanceOf(module, FilterModule)) {
            this.filterModules.push(module as FilterModule);

            this.logger.info(`Registered filter '${module.constructor.name}'`);
            return;
        }

        if (TypeUtils.likeInstanceOf(module, ScheduledTaskModule)) {
            this.scheduledTaskModules.push(module as ScheduledTaskModule);

            this.logger.info(`Registered scheduled task '${module.constructor.name}'`);
            return;
        }
    }
}