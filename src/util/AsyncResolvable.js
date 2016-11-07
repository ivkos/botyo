export default class AsyncResolvable {
    constructor() {}

    /**
     * @return {Promise.<T>}
     */
    resolve() {
        return Promise.reject("Not implemented");
    }
}