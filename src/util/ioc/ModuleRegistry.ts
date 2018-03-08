import { inject, injectable } from "inversify";
import { CommandModule, FilterModule, Logger, Module, ScheduledTaskModule } from "botyo-api";
import TypeUtils from "../TypeUtils";
import * as _ from "lodash";

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
        let commands: string | string[] = module.getCommand();

        if (!_.isString(commands) && !_.isArray(commands)) {
            throw new Error(`${module.constructor.name}::${module.getCommand.name}() must return a string or an array of strings`);
        }

        if (_.isArray(commands) && commands.length === 0) {
            throw new Error(`${module.constructor.name}::${module.getCommand.name}() must not return an empty array`);
        }

        if (!_.isArray(commands)) {
            commands = [commands];
        }

        for (let command of commands) {
            if (!ModuleRegistry.isValidCommand(command)) {
                throw new Error(`Module '${module.constructor.name}' is trying to handle invalid command '${command}'`);
            }

            const previouslyRegisteredCommandModule = this.commandToCommandModuleMap.get(command);

            if (previouslyRegisteredCommandModule !== undefined) {
                throw new Error(`Module '${module.constructor.name}' is trying to register command '${command}' ` +
                    `that is already registered by '${previouslyRegisteredCommandModule.constructor.name}'`);
            }

            this.commandToCommandModuleMap.set(command, module);
        }

        this.commandModules.push(module);

        this.logger.info(
            `Registered command module '${module.constructor.name}' ` +
            `handling command${commands.length > 1 ? 's' : ''}: ${commands.join(', ')}`
        );
    }

    private static isValidCommand(command: string): boolean
    {
        if (!command) return false;
        if (!_.isString(command)) return false;
        if (command.length === 0) return false;
        if (command.includes(' ')) return false;

        return true;
    }
}