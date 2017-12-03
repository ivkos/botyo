import { inject, injectable } from "inversify";
import { CommandModule, FilterModule, Logger, Module } from "botyo-api";
import { LoggerInstance } from "winston";

@injectable()
export default class ModuleRegistry
{
    private readonly commandModules: CommandModule[] = [];
    private readonly filterModules: FilterModule[] = [];
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

    register(module: Module)
    {
        if (module instanceof CommandModule) {
            const command: string = module.getCommand();
            const previouslyRegisteredCommandModule = this.commandToCommandModuleMap.get(command);

            if (previouslyRegisteredCommandModule !== undefined) {
                throw new Error(`Module '${module.constructor.name}' is trying to register command '${command}' ` +
                    `that is already registered by '${previouslyRegisteredCommandModule.constructor.name}'`);
            }

            this.commandToCommandModuleMap.set(command, module);
            this.commandModules.push(module);

            this.logger.info(`Registered module '${module.constructor.name}' handling command '${module.getCommand()}'`);
            return;
        }

        if (module instanceof FilterModule) {
            this.filterModules.push(module);

            this.logger.info(`Registered module '${module.constructor.name}'`);
            return;
        }
    }
}