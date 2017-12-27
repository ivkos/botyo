import { ApplicationConfiguration, Constants, Constructor, Module, } from "botyo-api";
import * as _ from "lodash";
import LodashConfiguration from "./LodashConfiguration";
import { AbstractModuleConfiguration } from "./AbstractModuleConfiguration";

export enum ConfigurationContext
{
    CHAT_THREAD,
    PARTICIPANT
}

export default class MessageContextAwareModuleConfiguration extends AbstractModuleConfiguration
{
    constructor(private readonly applicationConfiguration: ApplicationConfiguration,
                protected readonly moduleConstructor: Constructor<Module>,
                private readonly cfgCtx: ConfigurationContext,
                private readonly threadId: string,
                private readonly senderId: string)
    {
        super();
    }

    getProperty(property: string): any
    {
        return new LodashConfiguration(this.getRawObject()).getProperty(property);
    }

    hasProperty(property: string): boolean
    {
        return new LodashConfiguration(this.getRawObject()).hasProperty(property);
    }

    setProperty(property: string, value: any): void
    {
        const path = this.resolveModulePropertyPath(property);

        if (this.cfgCtx === ConfigurationContext.CHAT_THREAD) {
            this.applicationConfiguration.setProperty(
                `${Constants.CONFIG_KEY_CHAT_THREADS}.` +
                `'${this.threadId}'.` +
                `${Constants.CONFIG_KEY_OVERRIDES}.` +
                `${path}`,
                value
            );
            return;
        }

        if (this.cfgCtx === ConfigurationContext.PARTICIPANT) {
            this.applicationConfiguration.setProperty(
                `${Constants.CONFIG_KEY_CHAT_THREADS}.` +
                `'${this.threadId}'.${Constants.CONFIG_KEY_PARTICIPANTS}.` +
                `'${this.senderId}'.${Constants.CONFIG_KEY_OVERRIDES}.${path}`,
                value
            );
            return;
        }
    }

    getRawObject(): {}
    {
        let result;

        const cfgInCtxOfChatThread = {};
        _.merge(
            cfgInCtxOfChatThread,
            this.applicationConfiguration.getRawObject(),
            this.applicationConfiguration.getOrElse(
                `${Constants.CONFIG_KEY_CHAT_THREADS}[${this.threadId}].` +
                `${Constants.CONFIG_KEY_OVERRIDES}`,
                {}
            )
        );

        if (this.cfgCtx === ConfigurationContext.CHAT_THREAD) {
            result = cfgInCtxOfChatThread;
        }

        if (this.cfgCtx === ConfigurationContext.PARTICIPANT) {
            result = _.merge(
                {},
                cfgInCtxOfChatThread,
                this.applicationConfiguration.getOrElse(
                    `${Constants.CONFIG_KEY_CHAT_THREADS}[${this.threadId}].` +
                    `${Constants.CONFIG_KEY_PARTICIPANTS}[${this.senderId}].` +
                    `${Constants.CONFIG_KEY_OVERRIDES}`,
                    {}
                )
            );
        }

        return _.get(result, this.resolveModulePropertyPath());
    }
}