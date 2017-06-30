import { dependencies as Inject } from "needlepoint";
import CommandModule from "../CommandModule";
import ChatApi from "../../core/api/ChatApi";
import Configuration from "../../core/config/Configuration";
import Threads from "../../core/config/Threads";
import Markovski from "markovski";
import Bro from "brototype";
import Db from "mongodb";
import Promise from "bluebird";

const QUOTE_ON_REGEX = /\s+(on\s+(.+))$/ui;

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

        this.censorship = config.getModuleConfig(this, "censorship");

        if (this.censorship) {
            this.censorshipRegex = QuoteCommand.parseRegex(config.getModuleConfig(this, "censorshipRegex"));
        }
    }

    getCommand() {
        return "quote";
    }

    getDescription() {
        return "Generates a quote";
    }

    getUsage() {
        return "[ <person> | me | all [ on <subject> ] ]";
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

        if (targetId === this.api.getCurrentUserId()) {
            return this.api.sendMessage("\u{1F635}", threadId);
        }

        let subject;
        {
            const matches = argsString.match(QUOTE_ON_REGEX);
            if (matches == null || matches.length < 3) {
                subject = undefined;
            } else {
                subject = matches[2].trim().toLowerCase();
            }
        }

        const sentencePromise = this.getMessages(threadId, targetId)
            .then(history => history.map(m => m.body))
            .then(messages => this.buildMarkovSentence(messages, subject));

        const namePromise = targetId === -1
            ? Promise.resolve("\u{1F464}")
            : this.getParticipantName(targetId);

        return Promise
            .all([sentencePromise, namePromise])
            .then(([sentence, name]) => {
                if (!sentence)
                    return "\u{1F4AC}\u{2753}";

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

        argsString = argsString
            .replace(QUOTE_ON_REGEX, "")
            .trim()
            .toLowerCase();

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
        const singlePunctuation = new RegExp(/^[,.;:!?\(\)]$/);

        return new Markovski(this.markovModelOrder, this.markovBuildVom)
            .lowerCaseModelKeys(true)
            .wordNormalizer(word => word.replace(/[.,!?]+$/ig, ''))
            .sentenceToWordsSplitter(sentence => sentence
                .split(/\s/)
                .map(w => w.trim())
                .filter(w => w.length > 0)
                .filter(w => !singlePunctuation.test(w)))
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
            filterList.push({
                $or: [
                    { senderID: "fbid:" + targetId },
                    { senderID: "" + targetId }
                ]
            });
        } else {
            // messages by everyone but the bot
            filterList.push({
                $and: [
                    { senderID: { $ne: "fbid:" + this.api.getCurrentUserId() } },
                    { senderID: { $ne: "" + this.api.getCurrentUserId() } }
                ]
            });
        }

        filterList.push(
            { type: "message" },
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
     * @param {string=} subject
     * @return {string}
     * @private
     */
    buildMarkovSentence(messages, subject) {
        const markovski = this.createMarkovski();

        if (subject) {
            markovski.startWith(subject);
        }

        messages.forEach(m => markovski.train(m));

        let sentence;
        if (!this.censorship) {
            sentence = markovski.generate();
        } else {
            // TODO: Consider externalizing tries count in configuration
            for (let tries = 0; tries < 20; tries++) {
                const candidate = markovski.generate();

                if (!this.censorshipRegex.test(candidate)) {
                    sentence = candidate;
                    break;
                }
            }
        }

        if (sentence == subject) return;

        return sentence;
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

    /**
     * @param str
     * @returns {RegExp}
     * @private
     */
    static parseRegex(str) {
        const matches = str.match(new RegExp('^/(.*?)/([gimuy]*)$'));
        return new RegExp(matches[1], matches[2]);
    }
}