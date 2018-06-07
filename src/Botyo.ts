import "reflect-metadata";
import 'source-map-support/register'
import {
    ApplicationConfiguration,
    AsyncResolvable,
    ChatApi,
    CommandErrorHandlerModule,
    Constructor,
    Logger,
    MessageListener,
    Module,
    StopListeningFunction
} from "botyo-api";
import BotyoBuilder from "./BotyoBuilder";
import ApplicationContainer from "./util/ioc/ApplicationContainer";
import * as _ from "lodash";
import AsyncResolvableFacebookChatApi from "./util/async/AsyncResolvableFacebookChatApi";
import AsyncResolvableChatParticipantsResolver from "./util/async/AsyncResolvableChatParticipantsResolver";
import * as fs from "fs";
import ChatThreadFilter from "./modules/ChatThreadFilter";
import CommandExecutorFilter from "./modules/CommandExecutorFilter";
import FilterChain from "./modules/util/FilterChain";
import LoggingUtils from "./util/logging/LoggingUtils";
import HelpCommand from "./modules/HelpCommand";
import * as path from "path";
import ChatThreadParticipantsUpdaterScheduledTask from "./modules/ChatThreadParticipantsUpdaterScheduledTask";
import TaskScheduler from "./modules/util/TaskScheduler";
import ModuleRegistry from "./util/ioc/ModuleRegistry";
import * as Bluebird from "bluebird";
import { Container } from "inversify";
import CommandManager from "./util/ioc/CommandManager";

export default class Botyo
{
    private applicationConfiguration: ApplicationConfiguration;
    private applicationContainer: ApplicationContainer;
    private stopListening: StopListeningFunction;
    private taskScheduler: TaskScheduler;
    private running: boolean = false;
    private iocContainer: Container;
    private logger: Logger;

    constructor(private readonly applicationConfigurationProvider: () => ApplicationConfiguration,
                private readonly asyncResolvables: Constructor<AsyncResolvable<any>>[],
                private readonly modules: Constructor<Module>[],
                private readonly commandErrorHandler: Constructor<CommandErrorHandlerModule>,
                private readonly moduleConfigs: Map<Constructor<Module>, {}>)
    {}

    async start(): Promise<void>
    {
        if (this.running) return;
        this.running = true;

        Botyo.printBanner();

        this.logger = LoggingUtils.createLogger("Botyo", true);
        process.on('unhandledRejection', reason => {
            this.logger.error(reason);
        });

        this.applicationContainer = ApplicationContainer.create();
        this.applicationConfiguration = this.applicationConfigurationProvider.call(this);
        this.applicationContainer.bindApplicationConfiguration(this.applicationConfiguration);
        this.iocContainer = this.applicationContainer.getIoCContainer();

        await this.bindAsyncResolvables();
        this.bindModuleConfigs();
        this.bindModules();
        await this.attachFilterChainMessageListener();
        this.startTaskScheduler();
    }

    async stop(): Promise<void>
    {
        if (!this.running) return;
        this.running = false;

        this.logger.info("Botyo is shutting down...");

        try {
            await this.invokeFunctionOnAllModules("onShutdown")
        } catch (err) {
            this.logger.warn("A non-fatal error occurred while shutting down modules", err);
        }

        if (this.taskScheduler) this.taskScheduler.stop();
        if (this.stopListening) this.stopListening();

        this.logger.info("Botyo has been shut down");
    }

    private async bindAsyncResolvables()
    {
        await this.applicationContainer.bindAndResolveAsyncResolvable(AsyncResolvableFacebookChatApi);
        await this.applicationContainer.bindAndResolveAsyncResolvable(AsyncResolvableChatParticipantsResolver);

        for (let ar of this.asyncResolvables) {
            await this.applicationContainer.bindAndResolveAsyncResolvable(ar);
        }
    }

    private bindModuleConfigs()
    {
        for (let [moduleClass, moduleConfig] of this.moduleConfigs.entries()) {
            _.merge(this.applicationConfiguration.getRawObject(), {
                modules: {
                    [moduleClass.name]: moduleConfig
                }
            });
        }
    }

    private bindModules()
    {
        this.applicationContainer.bindToSelfAndGet(ChatThreadParticipantsUpdaterScheduledTask);
        this.applicationContainer.bindToSelfAndGet(ChatThreadFilter);
        this.applicationContainer.bindAndGet(CommandErrorHandlerModule.SYMBOL, this.commandErrorHandler);
        this.applicationContainer.bindToSelfAndGet(HelpCommand);

        for (let moduleClass of this.modules) {
            this.applicationContainer.bindToSelfAndGet(moduleClass);
        }

        this.applicationContainer.bindToSelfAndGet(CommandExecutorFilter);
        this.iocContainer.get(CommandManager).populate();
    }

    private async attachFilterChainMessageListener()
    {
        const filterChain = this.iocContainer.get(FilterChain);
        const chatApi = this.iocContainer.get(ChatApi.SYMBOL) as ChatApi & MessageListener;

        this.stopListening = chatApi.listen((err, msg) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            filterChain.pass(msg);
        });

        await this.invokeFunctionOnAllModules("onListen");
    }

    private async invokeFunctionOnAllModules(fnName: keyof Module)
    {
        await Bluebird
            .all(this.iocContainer
                .get(ModuleRegistry)
                .getModules()
                .map(module => module[fnName])
                .map(fn => Bluebird.try(() => fn())))
            .then(() => {});
    }

    private startTaskScheduler()
    {
        this.taskScheduler = this.iocContainer.get(TaskScheduler);
        this.taskScheduler.start();
    }

    static builder()
    {
        return new BotyoBuilder();
    }

    private static printBanner()
    {
        console.log(fs.readFileSync(path.join(__dirname, '..', 'banner.txt'), 'utf-8'));
    }
}