import {
    ApplicationConfiguration,
    ContextualizableModuleConfiguration,
    MessageContextSwitcher,
    ModuleConstructor
} from "botyo-api";
import MessageContextSwitcherImpl from "./MessageContextSwitcherImpl";

export default class ModuleConfigurationImpl extends ContextualizableModuleConfiguration
{
    constructor(private readonly applicationConfiguration: ApplicationConfiguration,
                protected readonly moduleConstructor: ModuleConstructor)
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

    getRawObject(): {}
    {
        return this.applicationConfiguration.getProperty(this.resolveModulePropertyPath());
    }
}