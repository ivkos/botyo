import { singleton as Singleton } from "needlepoint";
import * as YAML from "yamljs";
import * as fs from "fs";
import Bro from "brototype";

@Singleton
export default class Configuration {
    constructor(path) {
        if (!fs.existsSync(path)) {
            throw new Error("Configuration file '" + path + "' does not exist.");
        }

        const configurationHolder = YAML.parse(fs.readFileSync(path, 'utf8'));

        this.bro = Bro(configurationHolder);
    }

    get(property) {
        if (this.bro.doYouEven(property) === Bro.NOWAY) {
            throw new Error("Configuration property '" + property + "' was not found.");
        }

        return this.bro.iCanHaz(property);
    }
}