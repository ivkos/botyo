import { ApplicationConfiguration, MessageContextSwitcher, ModuleConfiguration, ModuleConstructor } from "botyo-api";
import MessageContextAwareModuleConfiguration, { ConfigurationContext } from "./MessageContextAwareModuleConfiguration";

export default class MessageContextSwitcherImpl extends MessageContextSwitcher
{
    private threadId: string;
    private senderId: string;

    constructor(private readonly applicationConfiguration: ApplicationConfiguration,
                private readonly moduleConstructor: ModuleConstructor,
                private readonly msg: any)
    {
        super();

        this.threadId = msg.threadID;
        this.senderId = msg.senderID;
    }

    ofChatThread(): ModuleConfiguration
    {
        return new MessageContextAwareModuleConfiguration(
            this.applicationConfiguration,
            this.moduleConstructor,
            ConfigurationContext.CHAT_THREAD,
            this.threadId,
            this.senderId
        );
    }

    ofParticipant(): ModuleConfiguration
    {
        return new MessageContextAwareModuleConfiguration(
            this.applicationConfiguration,
            this.moduleConstructor,
            ConfigurationContext.PARTICIPANT,
            this.threadId,
            this.senderId
        );
    }
}