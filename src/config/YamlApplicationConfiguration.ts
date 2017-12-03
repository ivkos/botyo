import {
    ApplicationConfiguration,
    CONFIG_KEY_PARTICIPANTS,
    ContextualizableModuleConfiguration,
    ModuleConstructor
} from "botyo-api";
import * as fs from "fs";
import * as YAML from "js-yaml";
import * as _ from "lodash";
import LodashConfiguration from "./LodashConfiguration";
import ModuleConfigurationImpl from "./ModuleConfigurationImpl";

export default class YamlApplicationConfiguration extends ApplicationConfiguration
{
    private readonly config: LodashConfiguration;
    private rawConfigObj: {};

    constructor(path: string)
    {
        super();

        if (!fs.existsSync(path)) {
            throw new Error(`Configuration file '${path}' does not exist`);
        }

        this.rawConfigObj = YAML.load(fs.readFileSync(path, 'utf8'));
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

    forModule(moduleConstructor: ModuleConstructor): ContextualizableModuleConfiguration
    {
        return new ModuleConfigurationImpl(this, moduleConstructor);
    }

    getRawObject(): {}
    {
        return this.rawConfigObj;
    }

    private static expandConfig(obj: {}, parentKey?: any)
    {
        _.entries(obj).forEach(([key, val]) => {
            if (_.isPlainObject(val)) {
                YamlApplicationConfiguration.expandConfig(val, key);
            }

            if (_.isArray(val)) {
                Array.from(val).forEach(x => YamlApplicationConfiguration.expandConfig(val, key));
            }

            // skip expanding dots in vanity usernames
            if (([CONFIG_KEY_PARTICIPANTS].includes(parentKey))) {
                return;
            }

            if (key.includes('.')) {
                delete (obj as any)[key];
                _.set(obj, key, val)
            }
        })
    }
}