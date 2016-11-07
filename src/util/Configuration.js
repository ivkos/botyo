import { singleton as Singleton } from "needlepoint";
import * as YAML from "yamljs";
import * as fs from "fs";
import Bro from "brototype";

@Singleton
export default class Configuration {
    constructor(path) {
        this.configFilePath = path;

        if (!fs.existsSync(this.configFilePath)) {
            throw new Error("Configuration file '" + this.configFilePath + "' does not exist.");
        }

        const configurationHolder = YAML.parse(fs.readFileSync(this.configFilePath, 'utf8'));

        this.bro = Bro(configurationHolder);
    }

    get(property) {
        if (this.bro.doYouEven(property) === Bro.NOWAY) {
            throw new Error("Configuration property '" + property + "' " +
                "was not found in configuration file '" + this.configFilePath + "'");
        }

        return this.bro.iCanHaz(property);
    }
}