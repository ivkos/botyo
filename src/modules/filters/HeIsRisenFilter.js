import FilterModule from "../FilterModule";
import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import ChatApi from "../../core/api/ChatApi";
import Configuration from "../../core/config/Configuration";
import moment from "moment";
import Bro from "brototype";

@Singleton
@Inject(ChatApi, Configuration)
export default class HeIsRisenFilter extends FilterModule {
    constructor(api, config) {
        super();

        this.api = api;

        this.timeLimit = config.getModuleConfig(this, "timeLimit");
        this.msgLimit = config.getModuleConfig(this, "msgLimit");

        this.watchEveryone = config.getModuleConfig(this, "watchEveryone");
        this.watchList = config.getModuleConfig(this, "watchList");
    }

    filter(msg) {
        if (!this.isOnWatchList(msg.senderID) && !this.watchEveryone) {
            return msg;
        }

        this.api.getThreadHistory(msg.threadID, 0, this.msgLimit, parseInt(msg.timestamp) - 1)
            .then(history => {
                const senderHistory = history
                    .filter(m => msg.senderID == m.senderID.split("fbid:")[1])
                    .sort((m1, m2) => m2.timestamp - m1.timestamp); // newest msgs first

                if (senderHistory.length == 0) {
                    return Promise.resolve();
                }

                const lastMsgTimestamp = senderHistory[0].timestamp;
                const timeOutTimestamp = moment(parseInt(msg.timestamp))
                    .subtract(this.timeLimit, 'minutes')
                    .valueOf();

                if (lastMsgTimestamp <= timeOutTimestamp) {
                    return Promise.resolve();
                }

                return Promise.reject(undefined);
            })
            .then(() => this.api.getUserInfo(msg.senderID))
            .then(info => {
                const bro = new Bro(info);
                const prop = msg.senderID + ".firstName";

                if (bro.doYouEven(prop) === Bro.NOWAY) {
                    console.error("msg.senderID", msg.senderID);
                    console.error("userInfo", info);
                    throw new Error("Could not get firstName");
                }

                return bro.iCanHaz(prop);
            })
            .then(firstName => this.api.sendMessage(firstName + " is risen! \u{1F64F}\u{1F446}", msg.threadID))
            .catch(err => {
                if (err) console.error(err);
            });

        return msg;
    }

    isOnWatchList(userId) {
        return this.watchList.indexOf(parseInt(userId)) !== -1;
    }
}