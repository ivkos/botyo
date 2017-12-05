import { interfaces } from "inversify";
import Newable = interfaces.Newable;
import Abstract = interfaces.Abstract;

namespace TypeUtils
{
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