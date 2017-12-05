import "reflect-metadata";
import 'source-map-support/register'
import {
    ApplicationConfiguration,
    AsyncResolvable,
    ChatApi,
    CommandErrorHandlerModule,
    MessageListener,
    Module
} from "botyo-api";
import BotyoBuilder from "./BotyoBuilder";
import ApplicationContainer from "./util/ioc/ApplicationContainer";
import { interfaces } from "inversify";
import * as _ from "lodash";
import AsyncResolvableFacebookChatApi from "./util/async/AsyncResolvableFacebookChatApi";
import AsyncResolvableChatParticipantsResolver from "./util/async/AsyncResolvableChatParticipantsResolver";
import * as fs from "fs";
import ChatThreadFilter from "./modules/ChatThreadFilter";
import CommandExecutorFilter from "./modules/CommandExecutorFilter";
import FilterChain from "./modules/util/FilterChain";
import { LoggerInstance } from "winston";
import LoggingUtils from "./util/logging/LoggingUtils";
import HelpCommand from "./modules/HelpCommand";
import * as path from "path";
import ChatThreadParticipantsUpdaterScheduledTask from "./modules/ChatThreadParticipantsUpdaterScheduledTask";
import TaskScheduler from "./modules/util/TaskScheduler";
import Newable = interfaces.Newable;

export default class Botyo
{
    private applicationConfiguration: ApplicationConfiguration;
    private applicationContainer: ApplicationContainer;
    private logger: LoggerInstance;

    constructor(private readonly applicationConfigurationProvider: () => ApplicationConfiguration,
                private readonly asyncResolvables: Newable<AsyncResolvable<any>>[],
                private readonly modules: Newable<Module>[],
                private readonly commandErrorHandler: Newable<CommandErrorHandlerModule>,
                private readonly moduleConfigs: Map<Newable<Module>, {}>)
    {}

    async start(): Promise<void>
    {
        Botyo.printBanner();

        this.logger = LoggingUtils.createLogger("Botyo", true);

        this.applicationContainer = ApplicationContainer.create();
        this.applicationConfiguration = this.applicationConfigurationProvider.call(this);
        this.applicationContainer.bindApplicationConfiguration(this.applicationConfiguration);

        await this.bindAsyncResolvables();
        this.bindModuleConfigs();
        this.bindModules();
        this.attachFilterChainMessageListener();
        this.startTaskScheduler();
    }

    async stop(): Promise<void>
    {
        // TODO Implement
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
    }

    private attachFilterChainMessageListener()
    {
        const filterChain = this.applicationContainer.getIoCContainer().get(FilterChain);
        const chatApi = this.applicationContainer.getIoCContainer().get(ChatApi.SYMBOL) as ChatApi & MessageListener;

        chatApi.listen((err, msg) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            filterChain.pass(msg);
        });
    }

    private startTaskScheduler()
    {
        const taskScheduler = this.applicationContainer.getIoCContainer().get(TaskScheduler);
        taskScheduler.start();
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