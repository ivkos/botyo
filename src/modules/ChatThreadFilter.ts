import { ApplicationConfiguration, CONFIG_KEY_CHAT_THREADS, FilterModule, Logger, Message } from "botyo-api";
import { inject } from "inversify";
import { LoggerInstance } from "winston";

export default class ChatThreadFilter extends FilterModule
{
    constructor(@inject(ApplicationConfiguration) private readonly applicationConfiguration: ApplicationConfiguration,
                @inject(Logger) private readonly logger: LoggerInstance)
    {
        super();
    }

    async filter(msg: Message): Promise<Message | void>
    {
        const threadID = msg.threadID;

        const chatThreadsObj = this.applicationConfiguration.getOrElse(`${CONFIG_KEY_CHAT_THREADS}[${threadID}]`, undefined);
        const shouldListen = chatThreadsObj !== undefined;

        if (!shouldListen) {
            this.logger.info(`Received a message from a chat thread (https://m.me/${threadID}) we are not listening to`);
            return;
        }

        return msg;
    }

}