import "source-map-support/register";
import { container as ApplicationIocContainer } from "needlepoint";
import Configuration from "./util/Configuration";
import FacebookClient from "./util/FacebookClient";
import ChatApi from "./util/ChatApi";
import Application from "./util/Application";

ApplicationIocContainer.registerInstance(Configuration, new Configuration("config.yaml"));
const client = ApplicationIocContainer.resolve(FacebookClient);

client.login().then(api => {
    ApplicationIocContainer.registerInstance(ChatApi, new ChatApi(api));

    return ApplicationIocContainer.resolve(Application).start();
}).catch(err => console.error(err));

//region Register termination handlers
const goodbye = () => {
    console.log("Facebook Group Chat Bot is shutting down...");

    if (client.isAppStateAvailable()) {
        return console.log("Bot is now offline. Will not log out to preserve app state.");
    }

    client.logout().then(() => {
        console.log("Bot is now offline and logged out of Facebook.");
        process.exit();
    });
};

process.on('SIGTERM', goodbye);
process.on('SIGINT', goodbye);
process.on('SIGHUP', goodbye);
//endregion
