export default class AsyncResolvable {
    /**
     * @param {T} resolvableType
     * @template T
     */
    constructor(resolvableType) {
        if (!resolvableType) {
            throw new Error("resolvableType is missing");
        }

        this._resolvableType = resolvableType;
    }

    /**
     * @return {Promise.<ResolvableResult.<T>>}
     */
    resolve() {
        return Promise.reject("Not implemented");
    }

    /**
     * @return {T}
     */
    getResolvableType() {
        return this._resolvableType;
    }
}

export class ResolvableResult {
    /**
     * @param {T} type
     * @param {T} result
     * @template T
     */
    constructor(type, result) {
        if (!type) throw new Error("type is missing");
        if (!result) throw new Error("result is missing");

        this.type = type;
        this.result = result;
    }

    /**
     * @return {T|*}
     */
    getType() {
        return this.type;
    }

    /**
     * @return {T|*}
     */
    getResult() {
        return this.result;
    }

    /**
     * @param {T} type
     * @param {Promise.<T>} promise
     * @return {Promise.<ResolvableResult.<T>>}
     */
    static of(type, promise) {
        if (!type) throw new Error("type is missing");
        if (!promise) throw new Error("Promise is missing");

        return promise.then(result => new ResolvableResult(type, result))
    }
}