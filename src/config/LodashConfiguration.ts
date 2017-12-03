import * as _ from "lodash";
import { Configuration } from "botyo-api";

export default class LodashConfiguration extends Configuration
{
    constructor(private readonly rawConfigObj: {})
    {
        super();
    }

    getProperty(property: string): any
    {
        if (!this.hasProperty(property)) {
            throw new Error(`Property '${property}' was not found in configuration`);
        }

        return _.get(this.rawConfigObj, property);
    }

    hasProperty(property: string): boolean
    {
        return _.has(this.rawConfigObj, property);
    }

    setProperty(property: string, value: any): void
    {
        _.set(this.rawConfigObj, property, value);
    }

    getRawObject(): {}
    {
        return this.rawConfigObj;
    }
}