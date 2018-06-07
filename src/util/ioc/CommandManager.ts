import * as _ from "lodash";
import {
    ChatThreadUtils,
    CommandModule,
    Constants,
    ContextualizableModuleConfiguration,
    FacebookId,
    Message
} from "botyo-api";
import ModuleRegistry from "./ModuleRegistry";
import { inject, injectable } from "inversify";

export type NameToCommandMap = Map<string, CommandModule>;

@injectable()
export default class CommandManager
{
    private readonly threadToNameToModuleMapMap: Map<FacebookId, NameToCommandMap> = new Map();

    constructor(@inject(ModuleRegistry) private readonly moduleRegistry: ModuleRegistry,
                @inject(ChatThreadUtils.SYMBOL) private readonly chatThreadUtils: ChatThreadUtils)
    {}

    populate(): void
    {
        for (let chatThreadId of this.chatThreadUtils.getChatThreadIds()) {
            const nameToModuleMap: Map<string, CommandModule> = new Map();

            for (let module of this.moduleRegistry.getCommandModules()) {
                const commands = this.getCommands(module, chatThreadId);

                for (let command of commands) {
                    if (!CommandManager.isValidCommand(command)) {
                        throw new Error(
                            `Module '${module.constructor.name}' is trying to handle invalid command '${command}' ` +
                            `in chat thread '${chatThreadId}'. ` +
                            `Please check the module source or its overrides in the configuration.`
                        );
                    }

                    const previouslyRegisteredCommandModule = nameToModuleMap.get(command);
                    if (previouslyRegisteredCommandModule !== undefined) {
                        throw new Error(
                            `Module '${module.constructor.name}' is trying to register command '${command}' ` +
                            `that is already registered by '${previouslyRegisteredCommandModule.constructor.name}' ` +
                            `in chat thread '${chatThreadId}'.`
                        );
                    }

                    nameToModuleMap.set(command, module);
                }
            }

            this.threadToNameToModuleMapMap.set(chatThreadId, nameToModuleMap);
        }
    }

    getCommandToCommandModuleMap(msg: Message): NameToCommandMap
    {
        return this.threadToNameToModuleMapMap.get(msg.threadID) as any as NameToCommandMap;
    }

    getCommandsByModuleAndChatThreadId(module: CommandModule, chatThreadId: FacebookId): string | string[]
    {
        return module.getRuntime()
            .getConfiguration().inContextOfChatThread(chatThreadId)
            .getOrElse(CommandManager.CONFIG_KEY_COMMAND, module.getCommand());
    }

    getCommandNameForModuleInContext(module: CommandModule, ctx: Message): string
    {
        const commands = this.getCommandsByModuleAndChatThreadId(module, ctx.threadID);

        if (_.isArray(commands)) return commands[0];
        return commands;
    }

    private getCommands(module: CommandModule, chatThreadId: FacebookId): string[]
    {
        const commands: string | string[] = this.getCommandsByModuleAndChatThreadId(module, chatThreadId);

        CommandManager.validateCommandArray(commands, module);

        if (!_.isArray(commands)) {
            return [commands];
        }

        return commands;
    }

    private static isValidCommand(command: string): boolean
    {
        if (!command) return false;
        if (!_.isString(command)) return false;
        if (command.length === 0) return false;
        if (command.includes(' ')) return false;

        return true;
    }

    private static validateCommandArray(commands: string | string[], module: CommandModule): void
    {
        if (!_.isString(commands) && !_.isArray(commands)) {
            throw new Error(
                `${module.constructor.name}::${module.getCommand.name}() or its override in configuration ` +
                `must be a string or an array of strings`
            );
        }

        if (_.isArray(commands) && commands.length === 0) {
            throw new Error(
                `${module.constructor.name}::${module.getCommand.name}() or its override in configuration ` +
                `must not be an empty array`
            );
        }
    }

    static getPrefixOfContext(cfg: ContextualizableModuleConfiguration, ctx: Message)
    {
        return cfg
            .inContext(ctx)
            .ofChatThread()
            .getOrElse(
                this.CONFIG_KEY_PREFIX,
                this.DEFAULT_PREFIX
            );
    }

    static makeHelpText(prefix: string, commandName: string, commandModule: CommandModule)
    {
        return `\u2139 ${prefix}${commandName} - ${commandModule.getDescription()}\n` +
            `\u{1F527} Usage: ${prefix}${commandName} ${commandModule.getUsage()}`;
    }

    static isCommandHiddenInContext(commandModule: CommandModule, ctx: Message): boolean
    {
        return commandModule.getRuntime()
            .getConfiguration()
            .inContext(ctx)
            .ofParticipant()
            .getOrElse(Constants.CONFIG_KEY_HIDDEN, false);
    }

    static isCommandEnabledInContext(commandModule: CommandModule, msg: Message): boolean
    {
        return commandModule.getRuntime()
            .getConfiguration()
            .inContext(msg)
            .ofParticipant()
            .isEnabled();
    }

    static readonly CONFIG_KEY_COMMAND = "command";
    static readonly CONFIG_KEY_PREFIX = "prefix";
    static readonly DEFAULT_PREFIX = "#";
}