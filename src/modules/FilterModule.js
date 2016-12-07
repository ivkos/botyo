import Promise from "bluebird";

export default class FilterModule {
    /**
     * Gets passed a message, optionally executes actions upon it, and returns a message.
     * The filter chain can be broken by returning a rejected promise.
     *
     * @param {*} msg The received message object.
     * @return {object|Promise.<*>} The resulting message or a promise of it.
     */
    filter(msg) {
        return msg;
    }
}