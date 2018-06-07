import {
    ApplicationConfiguration,
    Constants,
    Constructor,
    ContextualizableModuleConfiguration,
    Module,
} from "botyo-api";
import * as fs from "fs";
import * as YAML from "js-yaml";
import * as _ from "lodash";
import LodashConfiguration from "./LodashConfiguration";
import ModuleConfigurationImpl from "./ModuleConfigurationImpl";
import { AbstractConfiguration } from "./AbstractConfiguration";

export default class YamlApplicationConfiguration extends AbstractConfiguration implements ApplicationConfiguration
{
    private readonly config: LodashConfiguration;
    private rawConfigObj: object;

    constructor(path: string)
    {
        super();

        if (!fs.existsSync(path)) {
            throw new Error(`Configuration file '${path}' does not exist`);
        }

        this.rawConfigObj = YAML.load(fs.readFileSync(path, 'utf8')) as object;
        YamlApplicationConfiguration.expandConfig(this.rawConfigObj);

        this.config = new LodashConfiguration(this.rawConfigObj);
    }

    getProperty(property: string): any
    {
        return this.config.getProperty(property);
    }

    hasProperty(property: string): boolean
    {
        return this.config.hasProperty(property);
    }

    setProperty(property: string, value: any): void
    {
        this.config.setProperty(property, value);
    }

    forModule(moduleConstructor: Constructor<Module>): ContextualizableModuleConfiguration
    {
        return new ModuleConfigurationImpl(this, moduleConstructor);
    }

    getRawObject(): object
    {
        return this.rawConfigObj;
    }

    private static expandConfig(obj: object, parentKey?: any)
    {
        _.entries(obj).forEach(([key, val]) => {
            if (_.isPlainObject(val)) {
                YamlApplicationConfiguration.expandConfig(val, key);
            }

            if (_.isArray(val)) {
                Array.from(val).forEach(x => YamlApplicationConfiguration.expandConfig(val, key));
            }

            // skip expanding dots in vanity usernames
            if (([Constants.CONFIG_KEY_PARTICIPANTS].includes(parentKey))) {
                return;
            }

            if (key.includes('.')) {
                delete (obj as any)[key];
                _.set(obj, key, val)
            }
        })
    }
}