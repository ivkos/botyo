import { inject, injectable } from "inversify";
import { CommandModule, FilterModule, Logger, Module, ScheduledTaskModule } from "botyo-api";
import TypeUtils from "../TypeUtils";

@injectable()
export default class ModuleRegistry
{
    private readonly commandModules: CommandModule[] = [];
    private readonly filterModules: FilterModule[] = [];
    private readonly scheduledTaskModules: ScheduledTaskModule[] = [];
    private readonly commandToCommandModuleMap: Map<string, CommandModule> = new Map();

    constructor(@inject(Logger.SYMBOL) private readonly logger: Logger) {}

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
        if (!TypeUtils.isModule(module)) {
            throw new Error("This is not a module");
        }

        if (TypeUtils.isCommandModule(module)) {
            const command: string = module.getCommand();
            const previouslyRegisteredCommandModule = this.commandToCommandModuleMap.get(command);

            if (previouslyRegisteredCommandModule !== undefined) {
                throw new Error(`Module '${module.constructor.name}' is trying to register command '${command}' ` +
                    `that is already registered by '${previouslyRegisteredCommandModule.constructor.name}'`);
            }

            this.commandToCommandModuleMap.set(command, module);
            this.commandModules.push(module);

            this.logger.info(
                `Registered module '${module.constructor.name}' ` +
                `handling command '${module.getCommand()}'`
            );
            return;
        }

        if (TypeUtils.isFilterModule(module)) {
            this.filterModules.push(module);

            this.logger.info(`Registered filter '${module.constructor.name}'`);
            return;
        }

        if (TypeUtils.isScheduledTaskModule(module)) {
            this.scheduledTaskModules.push(module);

            this.logger.info(`Registered scheduled task '${module.constructor.name}'`);
            return;
        }
    }
}