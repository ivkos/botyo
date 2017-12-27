import { Container, decorate, injectable, interfaces } from "inversify";
import {
    AbstractEmptyAsyncResolvable,
    AbstractModule,
    ApplicationConfiguration,
    AsyncResolvable,
    ChatApi,
    ChatThreadUtils,
    Constructor,
    Logger,
    Module,
    ModuleAwareRuntime
} from "botyo-api";
import LoggingUtils, { LOGGER_NAME } from "../logging/LoggingUtils";
import * as _ from "lodash";
import ModuleRegistry from "./ModuleRegistry";
import ChatThreadUtilsImpl from "../ChatThreadUtilsImpl";
import FilterChain from "../../modules/util/FilterChain";
import TaskScheduler from "../../modules/util/TaskScheduler";
import TypeUtils from "../TypeUtils";
import { ModuleAwareRuntimeImpl } from "../ModuleAwareRuntimeImpl";
import ServiceIdentifier = interfaces.ServiceIdentifier;

const METADATA_KEYS = require("inversify/lib/constants/metadata_keys");

export default class ApplicationContainer
{
    private constructor(private readonly container: Container) {}

    static create(): ApplicationContainer
    {
        const container = new Container({ autoBindInjectable: true });
        const applicationContainer = new ApplicationContainer(container);

        applicationContainer.bindInternals();
        applicationContainer.bindLogger();

        return applicationContainer;
    }

    public bindApplicationConfiguration(ac: ApplicationConfiguration)
    {
        this.container.bind<ApplicationConfiguration>(ApplicationConfiguration.SYMBOL).toConstantValue(ac);
    }

    public bindToSelfAndGet<M extends Module>(moduleClass: Constructor<M>): M
    {
        return this.bindAndGet(moduleClass, moduleClass);
    }

    public bindAndGet<M extends Module>(serviceIdentifier: ServiceIdentifier<M>, moduleClass: Constructor<M>): M
    {
        this.decorateRoot(moduleClass, AbstractModule);

        moduleClass.prototype.runtime = this.createModuleAwareRuntime(moduleClass);

        this.container.bind<M>(serviceIdentifier).to(moduleClass).inSingletonScope();
        const module = this.container.get(serviceIdentifier);

        this.container.get(ModuleRegistry).register(module);

        return module;
    }

    public async bindAndResolveAsyncResolvable<R>(arClass: Constructor<AsyncResolvable<R>>): Promise<void>
    {
        this.decorateRoot(arClass);

        this.container.bind<AsyncResolvable<R>>(arClass).toSelf().inSingletonScope();

        const resolvable = this.container.get(arClass);
        const result = await resolvable.resolve();

        if (result === undefined ||
            resolvable.getServiceIdentifier() === AbstractEmptyAsyncResolvable.EMPTY_IDENTIFIER ||
            TypeUtils.likeInstanceOf(resolvable, AbstractEmptyAsyncResolvable)) {
            return;
        }

        this.container.bind(resolvable.getServiceIdentifier()).toConstantValue(result);
    }

    getIoCContainer(): Container
    {
        return this.container;
    }

    private createModuleAwareRuntime<M extends Module>(moduleClass: Constructor<M>): ModuleAwareRuntime
    {
        return new ModuleAwareRuntimeImpl(
            moduleClass,
            this.container.get(ChatApi.SYMBOL),
            this.container.get(ApplicationConfiguration.SYMBOL),
            this.container.getTagged(Logger.SYMBOL, LOGGER_NAME, moduleClass.name),
            this.container.get(ChatThreadUtils.SYMBOL)
        )
    }

    private decorateRoot<T, R>(clazz: Constructor<T>, root?: Constructor<R>): void
    {
        const protoChain = TypeUtils.getPrototypeChain(clazz);

        let rootOfClazz = root ? protoChain.find(c => c.name === root.name) : undefined;
        if (!rootOfClazz) {
            const idx = protoChain.map(c => c.name).lastIndexOf("");
            rootOfClazz = protoChain[idx - 1];
        }

        if (rootOfClazz === undefined) {
            throw new Error("Illegal state: Root of class not found");
        }

        if (!Reflect.hasOwnMetadata(METADATA_KEYS.PARAM_TYPES, rootOfClazz as Function)) {
            decorate(injectable(), rootOfClazz);
        }
    }

    private bindInternals(): void
    {
        this.container.bind<FilterChain>(FilterChain).toSelf().inSingletonScope();
        this.container.bind<TaskScheduler>(TaskScheduler).toSelf().inSingletonScope();
        this.container.bind<ModuleRegistry>(ModuleRegistry).toSelf().inSingletonScope();
        this.container.bind<ChatThreadUtils>(ChatThreadUtils.SYMBOL).to(ChatThreadUtilsImpl).inSingletonScope();
    }

    private bindLogger(): void
    {
        this.container.bind<Logger>(Logger.SYMBOL).toDynamicValue(ctx => {
            let loggerName;

            const tags = ctx.plan.rootRequest.target.getCustomTags();
            if (tags !== null) {
                const loggerNameTag = tags.find(tag => tag.key === LOGGER_NAME);
                if (loggerNameTag !== undefined) loggerName = loggerNameTag.value;
            }

            // try to guess it from target when injected
            if (loggerName === undefined) {
                const target = ctx.plan.rootRequest.target;
                loggerName = _.get(target, "serviceIdentifier.name") ||
                    _.get(target, "serviceIdentifier.prototype.name");
            }

            return LoggingUtils.createLogger(loggerName);
        });
    }
}