import {
    ApplicationConfiguration,
    AsyncResolvable,
    Bundle,
    CommandErrorHandlerModule,
    Constructor,
    Module
} from "botyo-api";
import YamlApplicationConfiguration from "./config/YamlApplicationConfiguration";
import Botyo from "./Botyo";
import FriendlyCommandErrorHandler from "./modules/FriendlyCommandErrorHandler";
import TypeUtils from "./util/TypeUtils";

export default class BotyoBuilder
{
    private static readonly DEFAULT_CONFIG_FILE = "config.yaml";

    private readonly asyncResolvables: Constructor<AsyncResolvable<any>>[] = [];
    private readonly modules: Constructor<Module>[] = [];
    private readonly moduleConfigs: Map<Constructor<Module>, {}> = new Map();

    private commandErrorHandler: Constructor<CommandErrorHandlerModule> = FriendlyCommandErrorHandler;

    private applicationConfigurationProvider: () => ApplicationConfiguration =
        () => new YamlApplicationConfiguration(BotyoBuilder.DEFAULT_CONFIG_FILE);

    configuration(config: ApplicationConfiguration | string): this
    {
        if (typeof config === "string") {
            this.applicationConfigurationProvider = () => new YamlApplicationConfiguration(config);
            return this;
        }

        if (!TypeUtils.isApplicationConfiguration(config)) {
            throw new Error(
                "Configuration must be the path to the configuration file or an instance of "
                + "ApplicationConfiguration"
            );
        }

        this.applicationConfigurationProvider = () => config;

        return this;
    }

    registerBundle(bundle: Bundle): this
    {
        BotyoBuilder.checkClass(bundle, "Bundle", TypeUtils.isBundle);

        bundle.asyncResolvables.forEach(ar => this.registerAsyncResolvable(ar));
        bundle.modules.forEach(m => this.registerModule(m));

        return this;
    }

    registerAsyncResolvable<R>(clazz: Constructor<AsyncResolvable<R>>): this
    {
        BotyoBuilder.checkClass(clazz, "AsyncResolvable", TypeUtils.isAsyncResolvable);

        this.asyncResolvables.push(clazz);
        return this;
    }

    registerModule<M extends Module>(clazz: Constructor<M>, config: {} = {}): this
    {
        BotyoBuilder.checkClass(clazz, "Module", TypeUtils.isModule);

        this.modules.push(clazz);
        this.moduleConfigs.set(clazz, config);

        return this;
    }

    registerCommandErrorHandler<M extends CommandErrorHandlerModule>(clazz: Constructor<M>, config: {} = {}): this
    {
        BotyoBuilder.checkClass(clazz, "CommandErrorHandlerModule", TypeUtils.isCommandErrorHandlerModule);

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

    private static checkClass(clazz: any, requiredInterface: Constructor<any> | string, typeGuardFn: (it: any) => boolean)
    {
        const requiredInterfaceName = (requiredInterface as Constructor<any>).name || requiredInterface;

        if (typeof clazz !== "function") {
            throw new Error(`Argument must be a constructor of a ${requiredInterfaceName}`);
        }

        if (!typeGuardFn(clazz)) {
            throw new Error(`The specified class '${clazz.name}' must conform to the ${requiredInterfaceName} interface`);
        }
    }
}