import Promise from "bluebird";
import { singleton as Singleton } from "needlepoint";

@Singleton
export default class ChatApi {
    /**
     * @param {*} rawApi the api object as defined in the facebook-chat-api module
     */
    constructor(rawApi) {
        /**
         * @private
         */
        this._rawApi = rawApi;

       /**
        * @type {WeakMap}
        * @private
        */
        this._apiFnToPromisifiedFnMap = new WeakMap();
    }

    /**
     * @param {ChatApi} chatApi
     * @private
     */
    cloneProperties(chatApi) {
        this._rawApi = chatApi._rawApi;
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
        return this._rawApi.listen(callback);
    }

    /**
     * Sends a message.
     *
     * @param {string|object} message plain string message or message object
     * @param {number} threadId
     * @return {Promise.<Object>} promise with message object representing the sent message
     */
    sendMessage(message, threadId) {
        return this._promisifyAndCache(this._rawApi.sendMessage)(message, threadId);
    }

    /**
     * Changes the chat's color.
     *
     * @param {string} color color hex string
     * @param {number} threadId
     * @return {Promise} empty promise
     */
    changeThreadColor(color, threadId) {
        return this._promisifyAndCache(this._rawApi.changeThreadColor)(color, threadId);
    }

    /**
     * Returns info about the thread.
     *
     * @param threadId
     * @return {Promise.<Object>} promise with info object
     */
    getThreadInfo(threadId) {
        return this._promisifyAndCache(this._rawApi.getThreadInfo)(threadId);
    }

    /**
     * Returns chat history for the thread indicated by threadId.
     *
     * @param {number} threadId
     * @param {number} amount The amount of messages to request
     * @param {number=} timestamp Used to described the time of the most recent message to load. If timestamp is
     *     undefined, facebook will load the most recent messages.
     *
     * @return {Promise.<Object[]>} promise with array of messages
     */
    getThreadHistory(threadId, amount, timestamp) {
        return this._promisifyAndCache(this._rawApi.getThreadHistory)(threadId, amount, timestamp);
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
            const endFn = this._rawApi.sendTypingIndicator(threadId, (err) => {
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
        return this._promisifyAndCache(this._rawApi.markAsRead)(threadId);
    }

    /**
     * Returns info about the user(s) by their id(s).
     *
     * @param {number|number[]} ids
     * @return {Promise.<Object>} promise with info object
     */
    getUserInfo(ids) {
        return this._promisifyAndCache(this._rawApi.getUserInfo)(ids);
    }

    /**
     * Returns the user ID of the user the bot is logged in as.
     *
     * @return {number} the user ID
     */
    getCurrentUserId() {
        return parseInt(this._rawApi.getCurrentUserID());
    }

    /**
     * Handles the message request for the specified thread ID.
     *
     * @param {number} threadId
     * @param {boolean} isAccepted whether to accept the request
     * @return {Promise} empty promise
     */
    handleMessageRequest(threadId, isAccepted) {
        return this._promisifyAndCache(this._rawApi.handleMessageRequest)(threadId, isAccepted);
    }

   /**
    * @param {function} fn
    * @private
    */
   _promisifyAndCache(fn) {
       let promisifiedFn = this._apiFnToPromisifiedFnMap.get(fn);

       if (!promisifiedFn) {
           promisifiedFn = Promise.promisify(fn);
           this._apiFnToPromisifiedFnMap.set(fn, promisifiedFn);
       }

      return promisifiedFn;
   }
}