import { AbstractFilterModule, ApplicationConfiguration, Constants, Logger, Message } from "botyo-api";
import { inject } from "inversify";

export default class ChatThreadFilter extends AbstractFilterModule
{
    constructor(@inject(ApplicationConfiguration.SYMBOL) private readonly applicationConfiguration: ApplicationConfiguration,
                @inject(Logger.SYMBOL) private readonly logger: Logger)
    {
        super();
    }

    async filter(msg: Message): Promise<Message | void>
    {
        const threadID = msg.threadID;

        const shouldListen = this.applicationConfiguration.hasProperty(
            `${Constants.CONFIG_KEY_CHAT_THREADS}[${threadID}]`
        );

        if (!shouldListen) {
            this.logger.info(`Received a message from a chat thread (https://m.me/${threadID}) we are not listening to`);
            return;
        }

        return msg;
    }
}