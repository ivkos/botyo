import { dependencies as Inject } from "needlepoint";
import CommandModule from "../CommandModule";
import ChatApi from "../../util/ChatApi";
import Configuration from "../../util/Configuration";
import Threads from "../../util/Threads";
import MarkovChain from "markovchain";
import Bro from "brototype";
import Db from "mongodb";

@Inject(ChatApi, Configuration, Threads, Db)
export default class QuoteCommand extends CommandModule {
    constructor(api, config, threads, db) {
        super();

        this.api = api;
        this.config = config;
        this.threads = threads;
        this.db = db;

        this.escape = this.config.get("app.commandEscape");
        this.maxMarkovSentenceWordCount = this.config.get("modules.quote.maxMarkovSentenceWordCount");
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

        const dbCollection = this.db.collection(`thread-${threadId}`);

        const messagesInDbCallback = dbCollection.find({
            "$and": [
                { senderID: "fbid:" + targetId },
                { attachments: { $size: 0 } },
                { body: { $exists: true } },
                { body: { $ne: "" } },
                { body: new RegExp("^(?!" + this.escape + ").+$") } // skip messages that start with command symbol
            ]
        }).toArray();

        const markovPromise = messagesInDbCallback
            .then(history => history.map(m => m.body))
            .then(messages => {
                const chain = new MarkovChain();
                messages.forEach(m => chain.parse(m));

                const randomWordFn = wordList => {
                    const words = Object.keys(wordList);
                    const randomIndex = Math.floor(Math.random() * words.length);
                    return words[randomIndex];
                };

                return chain
                    .start(randomWordFn)
                    .end(this.maxMarkovSentenceWordCount)
                    .process();
            });

        const userNamePromise = this.api
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

    isCommand(body) {
        return body.startsWith(this.escape);
    }

    getTargetIdFromArgsString(msg, argsString) {
        if (!argsString || argsString.length == 0) {
            return msg.senderID;
        }

        argsString = argsString.trim().toLowerCase();

        if (argsString == "me") {
            return msg.senderID;
        }

        return this.threads.getUserIdByThreadIdAndAlias(msg.threadID, argsString);
    }
}