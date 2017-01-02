import { dependencies as Inject } from "needlepoint";
import CommandModule from "../CommandModule";
import ChatApi from "../../core/api/ChatApi";
import Configuration from "../../core/config/Configuration";
import Threads from "../../core/config/Threads";
import Markovski from "markovski";
import Bro from "brototype";
import Db from "mongodb";
import natural from "natural";
import emojiRegex from "emoji-regex";
import emoticonToEmojiMap from "emoji-emoticon-to-unicode";

@Inject(ChatApi, Configuration, Threads, Db)
export default class QuoteCommand extends CommandModule {
    constructor(api, config, threads, db) {
        super();

        this.api = api;
        this.threads = threads;
        this.db = db;

        this.escape = config.get("app.commandEscape");
        this.maxMarkovSentenceWordCount = config.getModuleConfig(this, "maxMarkovSentenceWordCount");
        this.markovModelOrder = config.getModuleConfig(this, "markovModelOrder");
        this.markovBuildVom = config.getModuleConfig(this, "markovBuildVom");
    }

    getCommand() {
        return "quote";
    }

    getDescription() {
        return "Generates a quote";
    }

    getUsage() {
        return "[<person> | me]";
    }

    validate(msg, argsString) {
        return true;
    }

    execute(msg, argsString) {
        const threadId = msg.threadID;
        const targetId = this.getTargetIdFromArgsString(msg, argsString);

        if (targetId === undefined) {
            return this.api.sendMessage("Literally who?", threadId);
        }

        const sentencePromise = this.getMessages(threadId, targetId)
            .then(history => history.map(m => m.body))
            .then(messages => this.buildMarkovSentence(messages));

        const namePromise = targetId === -1
            ? Promise.resolve("\u{1F464}")
            : this.getParticipantName(targetId);

        return Promise
            .all([sentencePromise, namePromise])
            .then(([sentence, name]) => {
                return "“" + sentence + "”" + "\n"
                    + "– " + name;
            })
            .then(quote => this.api.sendMessage(quote, threadId));
    }

    /**
     * @param msg
     * @param argsString
     * @return {number|undefined}
     * @private
     */
    getTargetIdFromArgsString(msg, argsString) {
        if (!argsString || argsString.length == 0) {
            return msg.senderID;
        }

        argsString = argsString.trim().toLowerCase();

        if (argsString == "me") {
            return msg.senderID;
        }

        if (argsString == "all" || argsString == "*") {
            return -1;
        }

        return this.threads.getUserIdByThreadIdAndAlias(msg.threadID, argsString);
    }

    /**
     * @return {Markovski}
     * @private
     */
    createMarkovski() {
        const tokenizer = new natural.RegexpTokenizer({
            pattern: /[^A-Za-zА-Яа-я0-9_\-*@%$]+/
        });

        return new Markovski(this.markovModelOrder, this.markovBuildVom)
            .sentenceToWordsSplitter(sentence => sentence
                .split(/\s/)
                .map(w => w.trim())
                .filter(w => w.length > 0)
                .map(w => emoticonToEmojiMap[w] ? String.fromCodePoint(parseInt(emoticonToEmojiMap[w], 16)) : w)
                .map(w => emojiRegex().test(w) ? w : tokenizer.tokenize(w))
                .reduce((arr, val) => Array.isArray(val) ? arr.concat(val) : (arr.push(val), arr), []))
            .endWhen(this.maxMarkovSentenceWordCount);
    }

    /**
     * @param threadId
     * @param targetId
     * @return {Promise.<Array.<*>>} promise of array of message objects
     * @private
     */
    getMessages(threadId, targetId) {
        const filterList = [];
        if (targetId !== -1) {
            filterList.push({ senderID: "fbid:" + targetId });
        } else { // all
            filterList.push({ senderID: { $ne: "fbid:" + this.api.getCurrentUserId() } }); // skip messages by the bot
        }

        filterList.push(
            { attachments: { $size: 0 } },
            { body: { $exists: true } },
            { body: { $ne: "" } },
            { body: new RegExp("^(?!" + this.escape + ").+$") } // skip messages that start with command symbol
        );

        return this.db
            .collection(`thread-${threadId}`)
            .find({ "$and": filterList })
            .toArray();
    }

    /**
     * @param {Array.<string>} messages
     * @return {string}
     * @private
     */
    buildMarkovSentence(messages) {
        const markovski = this.createMarkovski();
        messages.forEach(m => markovski.train(m));
        return markovski.generate();
    }

    /**
     * @param targetId
     * @return {Promise.<string>}
     * @private
     */
    getParticipantName(targetId) {
        return this.api
            .getUserInfo(targetId)
            .then(info => {
                const bro = new Bro(info);
                const prop = targetId + ".name";

                if (!bro.doYouEven(prop)) {
                    console.error("targetId", targetId);
                    console.error("userInfo", info);
                    throw new Error("Could not get name");
                }

                return bro.iCanHaz(prop);
            });
    }
}