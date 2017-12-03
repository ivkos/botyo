import {
    ApplicationConfiguration,
    CONFIG_KEY_CHAT_THREADS,
    CONFIG_KEY_PARTICIPANTS,
    ModuleConfiguration,
    ModuleConstructor
} from "botyo-api";
import * as _ from "lodash";
import LodashConfiguration from "./LodashConfiguration";

export const CONFIG_KEY_OVERRIDES = "overrides";

export enum ConfigurationContext
{
    CHAT_THREAD,
    PARTICIPANT
}

export default class MessageContextAwareModuleConfiguration extends ModuleConfiguration
{
    constructor(private readonly applicationConfiguration: ApplicationConfiguration,
                protected readonly moduleConstructor: ModuleConstructor,
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
                `${CONFIG_KEY_CHAT_THREADS}.'${this.threadId}'.${CONFIG_KEY_OVERRIDES}.${path}`,
                value
            );
            return;
        }

        if (this.cfgCtx === ConfigurationContext.PARTICIPANT) {
            this.applicationConfiguration.setProperty(
                `${CONFIG_KEY_CHAT_THREADS}.'${this.threadId}'.${CONFIG_KEY_PARTICIPANTS}.'${this.senderId}'.${CONFIG_KEY_OVERRIDES}.${path}`,
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
            this.applicationConfiguration.getOrElse(`${CONFIG_KEY_CHAT_THREADS}[${this.threadId}].${CONFIG_KEY_OVERRIDES}`, {})
        );

        if (this.cfgCtx === ConfigurationContext.CHAT_THREAD) {
            result = cfgInCtxOfChatThread;
        }

        if (this.cfgCtx === ConfigurationContext.PARTICIPANT) {
            result = _.merge(
                {},
                cfgInCtxOfChatThread,
                this.applicationConfiguration.getOrElse(
                    `${CONFIG_KEY_CHAT_THREADS}[${this.threadId}].${CONFIG_KEY_PARTICIPANTS}[${this.senderId}].${CONFIG_KEY_OVERRIDES}`,
                    {}
                )
            );
        }

        return _.get(result, this.resolveModulePropertyPath());
    }
}