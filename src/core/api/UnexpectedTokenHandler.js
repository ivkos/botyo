import { container as ApplicationIocContainer } from "needlepoint";
import FacebookClient from "./FacebookClient";
import ChatApi from "./ChatApi";
import Promise from "bluebird";

export default class UnexpectedTokenHandler {
    static handle(err) {
        if (!UnexpectedTokenHandler.checkError(err)) return Promise.resolve();
        console.warn("Caught 'Unexpected token' error. Recovering...");

        const [facebookClient, chatApi] = ApplicationIocContainer.resolveAll(FacebookClient, ChatApi);

        return facebookClient.logout()
            .then(() => console.warn("Logout successful."))
            .catch(err => console.error("Logout failed.", err))
            .finally(() => facebookClient.login().then(newChatApi => {
                chatApi.cloneProperties(newChatApi);
                console.log("Successfully recovered from 'Unexpected token' error!");
            }));
    }

    /**
     * @param err
     * @return {boolean}
     * @private
     */
    static checkError(err) {
        if (!err.detail) return false;
        if (!(err.detail instanceof SyntaxError)) return false;
        if (!err.detail.message) return false;
        if (!err.res) return false;

        const isUnexpectedToken = err.detail.message.includes("Unexpected token < in JSON");
        const isRedirecting = err.res.includes("Redirecting...");

        return isUnexpectedToken && isRedirecting;
    }
}