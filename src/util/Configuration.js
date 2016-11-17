import { singleton as Singleton } from "needlepoint";
import * as YAML from "yamljs";
import * as fs from "fs";
import Bro from "brototype";
import CommandModule from "../modules/CommandModule";
import FilterModule from "../modules/FilterModule";
import ScheduledTask from "../modules/ScheduledTask";

@Singleton
export default class Configuration {
    /**
     * @param {string} path path of the configuration file
     * @throws {Error} if the configuration file cannot be found, or cannot be parsed
     */
    constructor(path) {
        this.configFilePath = path;

        if (!fs.existsSync(this.configFilePath)) {
            throw new Error("Configuration file '" + this.configFilePath + "' does not exist.");
        }

        const configurationHolder = YAML.parse(fs.readFileSync(this.configFilePath, 'utf8'));

        this.bro = Bro(configurationHolder);
    }

    /**
     * Returns the configuration indicated by its property
     *
     * @param {string} property
     * @return {*}
     * @throws {Error} if there is no such configuration property
     */
    get(property) {
        if (!this.has(property)) {
            throw new Error("Configuration property '" + property + "' " +
                "was not found in configuration file '" + this.configFilePath + "'");
        }

        return this.bro.iCanHaz(property);
    }

    /**
     * Returns true if the property is defined in the configuration file
     *
     * @param property
     * @return {*}
     */
    has(property) {
        return this.bro.doYouEven(property);
    }

    /**
     * Returns true if the module is enabled
     *
     * @param {CommandModule|FilterModule|ScheduledTask} moduleClassOrInstance
     */
    isModuleEnabled(moduleClassOrInstance) {
        const configPathCommand = `modules` +
            `.${Configuration.getConfigModulePathByModuleType(moduleClassOrInstance)}` +
            `.${moduleClassOrInstance.constructor.name}`;

        const configPathCommandEnabled = configPathCommand + `.enable`;

        const isCommandDefinedInConfig = this.has(configPathCommand);
        const isEnableFlagDefinedInConfig = this.has(configPathCommandEnabled);

        if (!isCommandDefinedInConfig || !isEnableFlagDefinedInConfig) {
            console.warn(`Configuration for module ${moduleClassOrInstance.constructor.name} (${configPathCommand}) `
                + `is missing. This module will be enabled by default.`);

            return true;
        }

        return !!this.get(configPathCommandEnabled);
    }

    /**
     * Returns configuration property for a module
     *
     * @param {CommandModule|FilterModule|ScheduledTask} module
     * @param {string} property
     * @return {*}
     */
    getModuleConfig(module, property) {
        const prop = `modules` +
            `.${Configuration.getConfigModulePathByModuleType(module)}` +
            `.${module.constructor.name}` +
            `.${property}`;

        return this.get(prop);
    }

    /**
     * Returns the property name for a specific module type
     *
     * @param moduleType
     * @private
     * @return {*}
     */
    static getConfigModulePathByModuleType(moduleType) {
        if (moduleType instanceof CommandModule) {
            return "commands";
        }

        if (moduleType instanceof FilterModule) {
            return "filters";
        }

        if (moduleType instanceof ScheduledTask) {
            return "scheduled-tasks";
        }

        console.error("Unknown type", {
            moduleType: moduleType,
            moduleTypePrototype: moduleType.prototype
        });

        throw new Error("Unknown type");
    }
}