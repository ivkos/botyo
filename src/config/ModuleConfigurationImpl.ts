import {
    ApplicationConfiguration,
    Constructor,
    ContextualizableModuleConfiguration,
    FacebookId,
    MessageContextSwitcher,
    Module,
    ModuleConfiguration
} from "botyo-api";
import MessageContextSwitcherImpl from "./MessageContextSwitcherImpl";
import { AbstractModuleConfiguration } from "./AbstractModuleConfiguration";

export default class ModuleConfigurationImpl
    extends AbstractModuleConfiguration implements ContextualizableModuleConfiguration
{
    constructor(private readonly applicationConfiguration: ApplicationConfiguration,
                protected readonly moduleConstructor: Constructor<Module>)
    {
        super();
    }

    getProperty(property: string): any
    {
        return this.applicationConfiguration.getProperty(this.resolveModulePropertyPath(property));
    }

    hasProperty(property: string): boolean
    {
        return this.applicationConfiguration.hasProperty(this.resolveModulePropertyPath(property));
    }

    setProperty(property: string, value: any): void
    {
        return this.applicationConfiguration.setProperty(this.resolveModulePropertyPath(property), value);
    }

    inContext(messageContext: {}): MessageContextSwitcher
    {
        return new MessageContextSwitcherImpl(this.applicationConfiguration, this.moduleConstructor, messageContext);
    }

    inContextOfChatThread(chatThreadId: FacebookId): ModuleConfiguration
    {
        return this.inContext({ threadID: chatThreadId }).ofChatThread();
    }

    getRawObject(): {}
    {
        return this.applicationConfiguration.getProperty(this.resolveModulePropertyPath());
    }
}