import { AbstractConfiguration } from "./AbstractConfiguration";
import { Constructor, Module, ModuleConfiguration } from "botyo-api";

export abstract class AbstractModuleConfiguration extends AbstractConfiguration implements ModuleConfiguration
{
    protected abstract readonly moduleConstructor: Constructor<Module>;

    isEnabled(): boolean
    {
        return this.getOrElse("enable", true);
    }

    protected resolveModulePropertyPath(property?: string)
    {
        return `modules` +
            `.${this.moduleConstructor.name}` +
            (property !== undefined && property !== "" ? `.${property}` : "");
    }
}