import Promise from "bluebird";
import { singleton as Singleton } from "needlepoint";

@Singleton
export default class ChatApi {
    /**
     * @param {*} api the api object as defined in the facebook-chat-api module
     */
    constructor(api) {
        this.api = api;

        this.api.setOptions({
            logLevel: "warn"
        });
    }

    /**
     * Function that gets called upon receiving a message.
     *
     * @callback messageHandler
     * @param {object} msg the message object
     */
    /**
     * Sets a callback function to be called upon receiving a message that gets passed the received message.
     *
     * @param {messageHandler} callback
     * @return {*}
     */
    listen(callback) {
        return this.api.listen(callback);
    }

    /**
     * Sends a message.
     *
     * @param {string|object} message plain string message or message object
     * @param {number} threadId
     * @return {Promise.<Object>} promise with message object representing the sent message
     */
    sendMessage(message, threadId) {
        return Promise.promisify(this.api.sendMessage)(message, threadId);
    }

    /**
     * Changes the chat's color.
     *
     * @param {string} color color hex string
     * @param {number} threadId
     * @return {Promise} empty promise
     */
    changeThreadColor(color, threadId) {
        return Promise.promisify(this.api.changeThreadColor)(color, threadId);
    }

    /**
     * Returns info about the thread.
     *
     * @param threadId
     * @return {Promise.<Object>} promise with info object
     */
    getThreadInfo(threadId) {
        return Promise.promisify(this.api.getThreadInfo)(threadId);
    }

    /**
     * Returns chat history for the thread indicated by threadId.
     *
     * @param {number} threadId
     * @param {number} start The ith message in the chat from which to start retrieving history.
     * @param {number} end The jth message in the chat to which retrieving history.
     * @param {number=} timestamp Used to described the end time. If set, will query messages up to and including timestamp.
     *
     * @return {Promise.<Object[]>} promise with array of messages
     */
    getThreadHistory(threadId, start, end, timestamp) {
        return Promise.promisify(this.api.getThreadHistory)(threadId, start, end, timestamp);
    }

    /**
     * Ends the typing indicator.
     *
     * @callback endFn
     * @return {Promise} empty promise
     */
    /**
     * Sends a typing indicator.
     *
     * @param {number} threadId
     * @return {Promise.<endFn>} promise with a function that ends the typing indicator when called
     */
    sendTypingIndicator(threadId) {
        return new Promise((resolve, reject) => {
            const endFn = this.api.sendTypingIndicator(threadId, (err) => {
                if (err) return reject(err);

                return resolve(this._endTypingIndicator(endFn));
            })
        });
    }

    /**
     * @param {function} originalEndFn
     * @private
     */
    _endTypingIndicator(originalEndFn) {
        return () => new Promise((resolve, reject) => {
            originalEndFn((err) => {
                if (err) return reject(err);

                return resolve();
            });
        });
    }

    /**
     * Marks the thread as read.
     *
     * @param {number} threadId
     * @return {Promise} empty promise
     */
    markAsRead(threadId) {
        return Promise.promisify(this.api.markAsRead)(threadId);
    }

    /**
     * Returns info about the user(s) by their id(s).
     *
     * @param {number|number[]} ids
     * @return {Promise.<Object>} promise with info object
     */
    getUserInfo(ids) {
        return Promise.promisify(this.api.getUserInfo)(ids);
    }

    /**
     * Returns the user ID of the user the bot is logged in as.
     *
     * @return {number} the user ID
     */
    getCurrentUserId() {
        return this.api.getCurrentUserID();
    }

    /**
     * Handles the message request for the specified thread ID.
     *
     * @param {number} threadId
     * @param {boolean} isAccepted whether to accept the request
     * @return {Promise} empty promise
     */
    handleMessageRequest(threadId, isAccepted) {
        return Promise.promisify(this.api.handleMessageRequest)(threadId, isAccepted);
    }
}