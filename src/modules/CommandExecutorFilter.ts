import {
    AbstractFilterModule,
    CommandErrorHandlerModule,
    ContextualizableModuleConfiguration,
    Logger,
    Message
} from "botyo-api";
import { inject } from "inversify";
import * as _ from "lodash";
import * as Bluebird from "bluebird";
import CommandManager from "../util/ioc/CommandManager";

export default class CommandExecutorFilter extends AbstractFilterModule
{
    constructor(@inject(CommandManager) private readonly commandManager: CommandManager,
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
        const commandModule = this.commandManager.getCommandToCommandModuleMap(msg).get(commandName);

        if (commandModule === undefined) {
            this.getRuntime().getLogger().info(`Unknown command '${commandName}'`);
            return;
        }

        if (!CommandManager.isCommandEnabledInContext(commandModule, msg)) {
            this.logger.info(
                `Command '${commandName}' is disabled in context: chat thread '${msg.threadID}' / participant '${msg.senderID}'`
            );

            return msg;
        }

        const chatApi = this.getRuntime().getChatApi();
        const args = CommandExecutorFilter.getArgs(msg);

        if (!commandModule.validate(msg, args)) {
            const prefix = CommandManager.getPrefixOfContext(configuration, msg);
            const helpText = CommandManager.makeHelpText(prefix, commandName, commandModule);

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

                Bluebird
                    .try(() => this.errorHandler.handle(err, msg, commandModule))
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

    private static getCommandNameFromMessage(cfg: ContextualizableModuleConfiguration, msg: Message)
    {
        const prefixedCommand = msg.body.split(/\s+/)[0];

        const prefix = CommandManager.getPrefixOfContext(cfg, msg);
        return prefixedCommand.substring(prefixedCommand.indexOf(prefix) + prefix.length);
    }

    private static shouldProcess(cfg: ContextualizableModuleConfiguration, msg: Message): boolean
    {
        const isEnabled = cfg
            .inContext(msg)
            .ofParticipant()
            .isEnabled();

        if (!isEnabled) return false;
        if (_.isEmpty(msg.body)) return false;

        const prefixOfContext = CommandManager.getPrefixOfContext(cfg, msg);
        return msg.body.startsWith(prefixOfContext);
    }
}