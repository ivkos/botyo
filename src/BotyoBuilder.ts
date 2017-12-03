import { ApplicationConfiguration, AsyncResolvable, CommandErrorHandlerModule, Module } from "botyo-api";
import YamlApplicationConfiguration from "./config/YamlApplicationConfiguration";
import Botyo from "./Botyo";
import { interfaces } from "inversify";
import FriendlyCommandErrorHandler from "./modules/FriendlyCommandErrorHandler";
import Newable = interfaces.Newable;

export default class BotyoBuilder
{
    private static readonly DEFAULT_CONFIG_FILE = "config.yaml";

    private readonly asyncResolvables: Newable<AsyncResolvable<any>>[] = [];
    private readonly modules: Newable<Module>[] = [];
    private readonly moduleConfigs: Map<Newable<Module>, {}> = new Map();

    private commandErrorHandler: Newable<CommandErrorHandlerModule> = FriendlyCommandErrorHandler;

    private applicationConfigurationProvider: () => ApplicationConfiguration =
        () => new YamlApplicationConfiguration(BotyoBuilder.DEFAULT_CONFIG_FILE);

    configuration(config: ApplicationConfiguration | string): this
    {
        if (typeof config === "string") {
            this.applicationConfigurationProvider = () => new YamlApplicationConfiguration(config);
            return this;
        }

        if (!(config instanceof ApplicationConfiguration)) {
            throw new Error(`Configuration must be the path to the configuration file ` +
                `or an instance of ${ApplicationConfiguration.name}`);
        }

        this.applicationConfigurationProvider = () => config;

        return this;
    }

    registerAsyncResolvable<R>(clazz: Newable<AsyncResolvable<R>>): this
    {
        BotyoBuilder.checkClass(AsyncResolvable, clazz);

        this.asyncResolvables.push(clazz);
        return this;
    }

    registerModule<M extends Module>(clazz: Newable<M>, config: {} = {}): this
    {
        BotyoBuilder.checkClass(Module, clazz);

        this.modules.push(clazz);
        this.moduleConfigs.set(clazz, config);

        return this;
    }

    registerCommandErrorHandler<M extends CommandErrorHandlerModule>(clazz: Newable<M>, config: {} = {}): this
    {
        BotyoBuilder.checkClass(CommandErrorHandlerModule, clazz);

        this.commandErrorHandler = clazz;
        this.moduleConfigs.set(clazz, config);

        return this;
    }

    build(): Botyo
    {
        return new Botyo(
            this.applicationConfigurationProvider,
            this.asyncResolvables,
            this.modules,
            this.commandErrorHandler,
            this.moduleConfigs
        );
    }

    private static checkClass(parentClazz: any, clazz: any)
    {
        if (typeof clazz !== "function") {
            throw new Error(`Argument must be a constructor of a ${parentClazz.name}`);
        }

        if (!parentClazz.isPrototypeOf(clazz)) {
            throw new Error(`The specified class '${clazz.name}' must be a subtype of ${parentClazz.name}`);
        }
    }
}