import {
    AbstractFilterModule,
    CommandErrorHandlerModule,
    Constructor,
    ContextualizableModuleConfiguration,
    Logger,
    Message,
    Module
} from "botyo-api";
import ModuleRegistry from "../util/ioc/ModuleRegistry";
import { inject } from "inversify";
import * as _ from "lodash";
import HelpCommand from "./HelpCommand";
import * as Bluebird from "bluebird";

export default class CommandExecutorFilter extends AbstractFilterModule
{
    constructor(@inject(ModuleRegistry) private readonly moduleRegistry: ModuleRegistry,
                @inject(CommandErrorHandlerModule.SYMBOL) private readonly errorHandler: CommandErrorHandlerModule,
                @inject(Logger.SYMBOL) private readonly logger: Logger)
    {
        super();
    }

    async filter(msg: Message): Promise<Message | void>
    {
        const configuration = this.getRuntime().getConfiguration();

        if (!CommandExecutorFilter.shouldProcess(configuration, msg)) {
            return msg;
        }

        const commandName = CommandExecutorFilter.getCommandNameFromMessage(configuration, msg);
        const commandModule = this.moduleRegistry.getCommandToCommandModuleMap().get(commandName);

        if (commandModule === undefined) {
            this.getRuntime().getLogger().info(`Unknown command '${commandName}'`);
            return;
        }

        const isCommandEnabledInCtx = this.getRuntime()
            .getApplicationConfiguration()
            .forModule(commandModule.constructor as Constructor<Module>)
            .inContext(msg)
            .ofParticipant()
            .isEnabled();

        if (!isCommandEnabledInCtx) {
            this.logger.info(
                `Command '${commandName}' is disabled in context: chat thread '${msg.threadID}' / participant '${msg.senderID}'`
            );

            return msg;
        }

        const chatApi = this.getRuntime().getChatApi();
        const args = CommandExecutorFilter.getArgs(msg);

        if (!commandModule.validate(msg, args)) {
            const prefix = CommandExecutorFilter.getPrefixOfContext(configuration, msg);
            const helpText = HelpCommand.makeHelpText(prefix, commandName, commandModule);

            return chatApi.sendMessage(
                msg.threadID,
                `\u26A0 Incorrect syntax\n\n${helpText}`
            );
        }

        chatApi.markAsRead(msg.threadID).catch(err => this.logger.warn(err));

        const endFnPromise = chatApi.sendTypingIndicator(msg.threadID);

        return Bluebird
            .try(() => commandModule.execute(msg, args))
            .catch(err => {
                const logger = this.getRuntime().getLogger();

                this.errorHandler.handle(err, msg, commandModule)
                    .catch(err => {
                        logger.error(`Error in ${this.errorHandler.constructor.name}::handle(...)`, err);
                    });

                logger.error(`Command '${commandName}' handled by '${commandModule.constructor.name}' failed`, err);
            })
            .finally(() => endFnPromise.then(endFn => endFn()));
    }

    private static getArgs(msg: Message): string
    {
        const prefixedCommand = msg.body.split(/\s+/)[0];
        return msg.body.substring(msg.body.indexOf(prefixedCommand) + prefixedCommand.length).trim();
    }

    static getCommandNameFromMessage(cfg: ContextualizableModuleConfiguration, msg: Message)
    {
        const prefixedCommand = msg.body.split(/\s+/)[0];

        const prefix = CommandExecutorFilter.getPrefixOfContext(cfg, msg);
        return prefixedCommand.substring(prefixedCommand.indexOf(prefix) + prefix.length);
    }

    static getPrefixOfContext(cfg: ContextualizableModuleConfiguration, ctx: Message)
    {
        return cfg
            .inContext(ctx)
            .ofChatThread()
            .getOrElse(
                CommandExecutorFilter.CONFIG_KEY_PREFIX,
                CommandExecutorFilter.DEFAULT_PREFIX
            );
    }

    private static shouldProcess(cfg: ContextualizableModuleConfiguration, msg: Message): boolean
    {
        const isEnabled = cfg
            .inContext(msg)
            .ofParticipant()
            .isEnabled();

        if (!isEnabled) return false;
        if (_.isEmpty(msg.body)) return false;

        const prefixOfContext = CommandExecutorFilter.getPrefixOfContext(cfg, msg);
        return msg.body.startsWith(prefixOfContext);
    }

    static readonly CONFIG_KEY_PREFIX = "prefix";
    static readonly DEFAULT_PREFIX = "#";
}