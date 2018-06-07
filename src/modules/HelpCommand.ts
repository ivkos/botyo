import { AbstractCommandModule, Message } from "botyo-api";
import { inject } from "inversify";
import CommandExecutorFilter from "./CommandExecutorFilter";
import CommandManager from "../util/ioc/CommandManager";
import ModuleRegistry from "../util/ioc/ModuleRegistry";

export default class HelpCommand extends AbstractCommandModule
{
    constructor(@inject(CommandManager) private readonly commandManager: CommandManager,
                @inject(ModuleRegistry) private readonly moduleRegistry: ModuleRegistry)
    {
        super();
    }

    getCommand(): string
    {
        return "help";
    }

    getDescription(): string
    {
        return "Responds with information how to use the available commands";
    }

    getUsage(): string
    {
        return "[ command ]";
    }

    validate(msg: Message, argsString: string): boolean
    {
        return true;
    }

    async execute(msg: Message, argsString: string): Promise<any>
    {
        const prefix = this.getContextPrefix(msg);

        if (argsString.length === 0) {
            return this.getRuntime()
                .getChatApi()
                .sendMessage(
                    msg.threadID,
                    this.makeCommandList(msg, prefix)
                );
        }

        let args = argsString;
        if (!args.startsWith(prefix)) {
            args = prefix + args;
        }

        return this.getHelp(msg, prefix, args);
    }

    private getHelp(msg: Message, prefix: string, args: string): Promise<any>
    {
        const commandName = HelpCommand.getCommandNameFromString(prefix, args);
        const commandModule = this.commandManager.getCommandToCommandModuleMap(msg).get(commandName);

        if (commandModule === undefined) {
            return this.getRuntime().getChatApi().sendMessage(
                msg.threadID,
                `\u26A0 Unknown command: ${prefix}${commandName}`
            );
        }

        const helpText = CommandManager.makeHelpText(prefix, commandName, commandModule);

        return this.getRuntime().getChatApi().sendMessage(msg.threadID, helpText);
    }

    private getContextPrefix(ctx: Message)
    {
        return CommandManager.getPrefixOfContext(this.getRuntime().getApplicationConfiguration().forModule(CommandExecutorFilter), ctx);
    }

    private makeCommandList(ctx: Message, prefix: string): string
    {
        let str = "\u{1F527} Command list:\n\n";

        for (let module of this.moduleRegistry.getCommandModules()) {
            if (CommandManager.isCommandHiddenInContext(module, ctx) ||
                !CommandManager.isCommandEnabledInContext(module, ctx)) {
                continue;
            }

            const commandName = this.commandManager.getCommandNameForModuleInContext(module, ctx);
            str += `${prefix}${commandName} - ${module.getDescription()}\n`;
        }

        return str;
    }

    private static getCommandNameFromString(prefix: string, str: string): string
    {
        const prefixedCommand = str.split(/\s+/)[0];
        return prefixedCommand.substring(prefixedCommand.indexOf(prefix) + prefix.length);
    }
}