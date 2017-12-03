import { CommandModule, Message, ModuleConstructor } from "botyo-api";
import { inject } from "inversify";
import ModuleRegistry from "../util/ioc/ModuleRegistry";
import CommandExecutorFilter from "./CommandExecutorFilter";

export default class HelpCommand extends CommandModule
{
    constructor(@inject(ModuleRegistry) private readonly moduleRegistry: ModuleRegistry)
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
        const commandModule = this.moduleRegistry.getCommandToCommandModuleMap().get(commandName);

        if (commandModule === undefined) {
            return this.getRuntime().getChatApi().sendMessage(
                `\u26A0 Unknown command: ${prefix}${commandName}`,
                msg.threadID
            );
        }

        const helpText = HelpCommand.makeHelpText(prefix, commandName, commandModule);

        return this.getRuntime().getChatApi().sendMessage(msg.threadID, helpText);
    }

    static makeHelpText(prefix: string, commandName: string, commandModule: CommandModule)
    {
        return `\u2139 ${prefix}${commandName} - ${commandModule.getDescription()}\n` +
            `\u{1F527} Usage: ${prefix}${commandName} ${commandModule.getUsage()}`;
    }

    private getContextPrefix(ctx: Message)
    {
        return CommandExecutorFilter.getPrefixOfContext(this.getRuntime()
            .getApplicationConfiguration().forModule(CommandExecutorFilter), ctx);
    }

    private makeCommandList(ctx: Message, prefix: string): string
    {
        let str = "\u{1F527} Command list:\n\n";

        for (let [commandName, module] of this.moduleRegistry.getCommandToCommandModuleMap().entries()) {
            const moduleCfg = this.getRuntime()
                .getApplicationConfiguration().forModule(module.constructor as ModuleConstructor);

            const isHidden = moduleCfg.inContext(ctx).ofParticipant()
                .getOrElse(HelpCommand.CONFIG_KEY_HIDDEN, false);

            if (isHidden) continue;

            str += `${prefix}${commandName} - ${module.getDescription()}\n`;
        }

        return str;
    }

    private static getCommandNameFromString(prefix: string, str: string): string
    {
        const prefixedCommand = str.split(/\s+/)[0];
        return prefixedCommand.substring(prefixedCommand.indexOf(prefix) + prefix.length);
    }

    private static readonly CONFIG_KEY_HIDDEN = "hidden";
}