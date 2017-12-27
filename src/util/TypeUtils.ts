import { interfaces } from "inversify";
import {
    ApplicationConfiguration,
    AsyncResolvable,
    Bundle,
    CommandErrorHandlerModule,
    CommandModule,
    Configuration,
    FilterModule,
    Module,
    ScheduledTaskModule
} from "botyo-api";
import Newable = interfaces.Newable;
import Abstract = interfaces.Abstract;

namespace TypeUtils
{
    function containsNoUndefined(...args: any[]): boolean
    {
        return !args.includes(undefined);
    }

    export function isBundle(it: any): it is Bundle
    {
        return containsNoUndefined(it.modules, it.asyncResolvables);
    }

    export function isAsyncResolvable(it: any): it is AsyncResolvable<any>
    {
        return containsNoUndefined(
            it.resolve,
            it.getServiceIdentifier
        );
    }

    export function isConfiguration(it: any): it is Configuration
    {
        return containsNoUndefined(
            it.getProperty,
            it.getOrElse,
            it.hasProperty,
            it.setProperty,
            it.getRawObject
        );
    }

    export function isApplicationConfiguration(it: any): it is ApplicationConfiguration
    {
        if (!isConfiguration(it)) return false;

        return containsNoUndefined(
            (it as any).getProperty,
            (it as any).getOrElse,
            (it as any).hasProperty,
            (it as any).setProperty,
            (it as any).getRawObject
        );
    }

    export function isModule(it: any): it is Module
    {
        return containsNoUndefined(
            it.getRuntime,
            it.onListen,
            it.onShutdown
        );
    }

    export function isCommandErrorHandlerModule(it: any): it is CommandErrorHandlerModule
    {
        if (!isModule(it)) return false;
        return (it as any).handle !== undefined;
    }

    export function isCommandModule(it: any): it is CommandModule
    {
        if (!isModule(it)) return false;

        return containsNoUndefined(
            (it as any).getCommand,
            (it as any).getDescription,
            (it as any).getUsage,
            (it as any).validate,
            (it as any).execute
        );
    }

    export function isFilterModule(it: any): it is FilterModule
    {
        if (!isModule(it)) return false;
        return (it as any).filter !== undefined;
    }

    export function isScheduledTaskModule(it: any): it is ScheduledTaskModule
    {
        if (!isModule(it)) return false;

        return containsNoUndefined(
            (it as any).execute,
            (it as any).getSchedule,
            (it as any).shouldExecuteOnStart
        );
    }

    export function likeInstanceOf(obj: any, clazz: Function): boolean
    {
        if (obj instanceof clazz) return true;
        if (!(obj instanceof Object)) return false;

        return isClassDescendantOf(obj.constructor, clazz);
    }

    export function isClassDescendantOf(clazz: Function, parentClazz: Function)
    {
        if (parentClazz.isPrototypeOf(clazz)) return true;

        const clazzProtoChain = getPrototypeChain(clazz).map(c => c.name);
        const parentProtoChain = getPrototypeChain(parentClazz).map(c => c.name);

        const idx = clazzProtoChain.lastIndexOf(parentProtoChain[0]);
        if (idx === -1) return false;

        return clazzProtoChain.slice(idx).every((v, i) => v === parentProtoChain[i]);
    }

    export function getPrototypeChain(clazz: Function)
    {
        const chain = [];

        let ctor = clazz;
        while (ctor !== null) {
            chain.push(ctor);
            ctor = Object.getPrototypeOf(ctor);
        }

        return chain;
    }

    export function ifLikeInstanceOf<T>(obj: any, clazz: Newable<T> | Abstract<T>, fn: (arg: T) => any)
    {
        if (likeInstanceOf(obj, clazz as Function)) {
            fn(obj as T);
        }
    }
}

export default TypeUtils;