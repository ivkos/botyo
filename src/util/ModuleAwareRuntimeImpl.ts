import {
    ApplicationConfiguration,
    ChatApi,
    ChatThreadUtils,
    Constructor,
    ContextualizableModuleConfiguration,
    Logger,
    Module,
    ModuleAwareRuntime
} from "botyo-api";

export class ModuleAwareRuntimeImpl implements ModuleAwareRuntime
{
    constructor(private readonly moduleConstructor: Constructor<Module>,
                private readonly chatApi: ChatApi,
                private readonly applicationConfiguration: ApplicationConfiguration,
                private readonly logger: Logger,
                private readonly chatThreadUtils: ChatThreadUtils)
    {}

    getChatApi(): ChatApi
    {
        return this.chatApi;
    }

    getApplicationConfiguration(): ApplicationConfiguration
    {
        return this.applicationConfiguration;
    }

    getConfiguration(): ContextualizableModuleConfiguration
    {
        return this.getApplicationConfiguration().forModule(this.moduleConstructor);
    }

    getLogger(): Logger
    {
        return this.logger;
    }

    getChatThreadUtils(): ChatThreadUtils
    {
        return this.chatThreadUtils;
    }
}