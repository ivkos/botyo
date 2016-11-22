import { dependencies as Inject } from "needlepoint";
import CommandModule from "../CommandModule";
import ChatApi from "../../util/ChatApi";
import Configuration from "../../util/Configuration";
import Threads from "../../util/Threads";
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

        const messagesInDbCallback = this.db
            .collection(`thread-${threadId}`)
            .find({ "$and": filterList })
            .toArray();

        let start = 0;
        const markovPromise = messagesInDbCallback
            .then(history => {
                start = Date.now();
                return history;
            })
            .then(history => history.map(m => m.body))
            .then(messages => {
                const markovski = this.createMarkovski();
                messages.forEach(m => markovski.train(m));
                const sentence = markovski.generate();

                const end = Date.now();
                console.info(`targetId ${targetId}: Built Markov chain from ${messages.length} messages in ${end - start} ms`);

                return sentence;
            });

        let userNamePromise;
        if (targetId !== -1) {
            userNamePromise = this.api
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
        } else { // all
            userNamePromise = Promise.resolve("\u{1F464}")
        }

        return Promise
            .all([markovPromise, userNamePromise])
            .then(result => {
                const markovSentence = result[0];
                const name = result[1];

                return "“" + markovSentence + "”" + "\n"
                    + "– " + name;
            })
            .then(quote => this.api.sendMessage(quote, threadId));
    }

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
     *
     * @return {Markovski}
     */
    createMarkovski() {
        const tokenizer = new natural.RegexpTokenizer({
            pattern: /[^A-Za-zА-Яа-я0-9_\-*@%$]+/
        });

        return new Markovski(this.markovModelOrder)
            .sentenceToWordsSplitter(sentence => sentence
                .split(/\s/)
                .map(w => w.trim())
                .filter(w => w.length > 0)
                .map(w => emoticonToEmojiMap[w] ? String.fromCodePoint(parseInt(emoticonToEmojiMap[w], 16)) : w)
                .map(w => emojiRegex().test(w) ? w : tokenizer.tokenize(w))
                .reduce((arr, val) => Array.isArray(val) ? arr.concat(val) : (arr.push(val), arr), []))
            .endWhen(this.maxMarkovSentenceWordCount);
    }
}