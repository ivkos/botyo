import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Db from "mongodb";
import ScheduledTask from "../ScheduledTask";
import Configuration from "../../util/Configuration";
import ChatApi from "../../util/ChatApi";
import Threads from "../../util/Threads";
import Promise from "bluebird";
import until from "async/until";

@Singleton
@Inject(Configuration, Db, ChatApi, Threads)
export default class ThreadHistoryDownloader extends ScheduledTask {
    /**
     * @param {Configuration} config
     * @param {Db} db
     * @param {ChatApi} api
     * @param {Threads} threads
     */
    constructor(config, db, api, threads) {
        super();

        this.config = config;
        this.db = db;
        this.api = api;
        this.threads = threads;
    }

    getInterval() {
        return 5 * 60 * 1000;
    }

    shouldExecuteOnStart() {
        return true;
    }

    execute() {
        const threadIds = this.threads.getThreadIds();

        const promises = threadIds.map(id => this.downloadMessagesByThreadId(id));

        return Promise.all(promises);
    }

    downloadMessagesByThreadId(threadId) {
        const dbCollection = this.db.collection(`thread-${threadId}`);

        //region promises
        //region messageID index
        const msgIdIndexName = "messageID";
        const uniqueMsgIdIndex = {};
        uniqueMsgIdIndex[msgIdIndexName] = 1;

        const createIndexPromise = dbCollection.indexExists(msgIdIndexName)
            .then(() => Promise.resolve())
            .catch((err) => dbCollection.createIndex(uniqueMsgIdIndex, { unique: true }));
        //endregion

        const dbMsgCountPromise = dbCollection.count();
        const fbMsgCountPromise = this.api.getThreadInfo(threadId).then(info => info.messageCount);
        //endregion

        return Promise
            .all([createIndexPromise, dbMsgCountPromise, fbMsgCountPromise])
            .spread((createIndex, dbCount, fbCount) => {
                console.log(`Thread ${threadId}: There are ${dbCount} in db, ${fbCount} from fb`);

                if (dbCount >= fbCount) {
                    return Promise.reject(`Thread ${threadId}: messages in db >= messages from fb`);
                }

                const diff = fbCount - dbCount;
                console.log(`Thread ${threadId}: Message cache is ${diff} messages behind.`);

                return Promise.resolve(diff);
            })
            .then(msgCountToDownload => {
                const msgsPerRequest = Math.min(msgCountToDownload, 500);

                let i = 0;
                let lastTimestamp = +Date.now();
                let downloadedMessages = [];

                return new Promise((resolve, reject) => {
                    until(() => (i * msgsPerRequest) >= msgCountToDownload, (done) => {
                        this.api.getThreadHistory(threadId, 0, msgsPerRequest, lastTimestamp)
                            .then(messages => {
                                downloadedMessages = messages.concat(downloadedMessages);
                                lastTimestamp = parseInt(messages[0].timestamp) - 1;
                                i++;

                                console.log(`Thread ${threadId}: Downloaded ${downloadedMessages.length}/${msgCountToDownload} messages`);

                                if (messages.length != msgsPerRequest) {
                                    console.warn(`Thread ${threadId}: Expected ${msgsPerRequest} but got ${messages.length} messages`);
                                }

                                done();
                            })
                            .catch(err => done(err));
                    }, (err) => {
                        if (err) return reject(err);

                        return resolve(downloadedMessages);
                    });
                });
            }).then(downloadedMessages => dbCollection.insertMany(downloadedMessages, {
                ordered: false // throw everything at the db and see what persists, i.e. don't stop on duplicate keys
            }))
            .catch(err => {
                // ignore duplicate keys error
                if (err.code === 11000) {
                    return console.warn(`Thread ${threadId}: There were ${err.writeErrors.length} duplicate messages`);
                }

                return err;
            });
    }
}