import CommandModule from "../CommandModule";
import ChatApi from "../../core/api/ChatApi";
import { dependencies as Inject } from "needlepoint";
import Threads from "../../core/config/Threads";
import Promise from "bluebird";

@Inject(ChatApi, Threads)
export default class PingCommand extends CommandModule {
    constructor(api, threads) {
        super();

        this.api = api;
        this.threads = threads;
    }

    getCommand() {
        return "ping";
    }

    getDescription() {
        return "Responds to the ping, or sends a ping to a specific person";
    }

    getUsage() {
        return "[person]";
    }

    validate(msg, argsString) {
        return true;
    }

    execute(msg, argsString) {
        if (argsString.trim().length === 0) {
            return this.api.sendMessage("pong! \ud83d\ude02", msg.threadID);
        }

        const targetId = this.threads.getUserIdByThreadIdAndAlias(msg.threadID, argsString);
        if (targetId === undefined) {
            return this.api.sendMessage("Literally who?", msg.threadID);
        }

        const senderId = parseInt(msg.senderID.split("fbid:")[1] || msg.senderID);
        if (!senderId) throw new Error("Could not get senderId");

        const threadNamePromise = this.api.getThreadInfo(msg.threadID)
            .then(info => info.name || Promise.reject("No thread name"));
        const senderNamePromise = this.api.getUserInfo(senderId)
            .then(info => info[senderId].name || Promise.reject("Could not get sender name", info));
        const targetNamePromise = this.api.getUserInfo(targetId)
            .then(info => info[targetId].firstName || Promise.reject("Could not get target name", info));

        return Promise
            .all([targetNamePromise, threadNamePromise, senderNamePromise])
            .then(([targetName, threadName, senderName]) => [
                targetName,
                this.api.sendMessage({
                    body: `\u{1F4E2} Hey ${targetName}, you received a ping!\n` +
                    `\u{1F4E5} From ${senderName} in ${threadName}:\n` +
                    `\u{1F517} ${PingCommand.getShortUrl(msg.threadID)}`
                }, targetId)
            ])
            .all()
            .then(([targetName]) => this.api.sendMessage(`\u{2714}\u{FE0F} Ping to ${targetName} sent!`, msg.threadID));
    }

    static getShortUrl(id) {
        return `https://m.me/${id}`
    }
}