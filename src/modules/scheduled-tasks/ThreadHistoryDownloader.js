import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Db from "mongodb";
import ScheduledTask from "../ScheduledTask";
import Configuration from "../../core/config/Configuration";
import ChatApi from "../../core/api/ChatApi";
import Threads from "../../core/config/Threads";
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

    execute() {
        const threadIds = this.threads.getThreadIds();

        const promises = threadIds.map(id => this.downloadMessagesByThreadId(id));

        return Promise.all(promises);
    }

    downloadMessagesByThreadId(threadId) {
        const dbCollection = this.db.collection(`thread-${threadId}`);

        return Promise
            .all([
                ThreadHistoryDownloader.createUniqueIndexIfNotExists(dbCollection),
                dbCollection.count(),
                this.api.getThreadInfo(threadId).then(info => info.messageCount)
            ])
            .then(([_, dbCount, fbCount]) => ThreadHistoryDownloader.handleMessageCount(dbCount, fbCount, threadId))
            .then(messageCount => this.batchDownloadMessages(messageCount, threadId))
            .then(messages => dbCollection.insertMany(messages, {
                ordered: false // throw everything at the db and see what persists, i.e. don't stop on duplicate keys
            }))
            .catch(ThreadHistoryDownloadCancelledError, err => console.warn(err.message))
            .catch(err => ThreadHistoryDownloader.handleDuplicateKeysError(err, threadId));
    }

    batchDownloadMessages(messageCount, threadId) {
        const msgsPerRequest = Math.min(messageCount, 500);

        let i = 0;
        let lastTimestamp = +Date.now();
        let downloadedMessages = [];

        return new Promise((resolve, reject) => {
            until(
                () => (i * msgsPerRequest) >= messageCount,
                done => {
                    this.api.getThreadHistory(threadId, 0, msgsPerRequest, lastTimestamp).then(messages => {
                        downloadedMessages = messages.concat(downloadedMessages);
                        lastTimestamp = parseInt(messages[0].timestamp) - 1;
                        i++;

                        console.log(`Thread ${threadId}: Downloaded total ${downloadedMessages.length}/${messageCount} messages (got ${messages.length})`);

                        done();
                    }).catch(err => done(err));
                },
                err => {
                    if (err) return reject(err);

                    return resolve(downloadedMessages);
                });
        });
    }

    static handleMessageCount(dbCount, fbCount, threadId) {
        console.log(`Thread ${threadId}: There are ${dbCount} messages in cache, and ${fbCount} reported by Facebook`);

        if (dbCount == fbCount) {
            return Promise.reject(new ThreadHistoryDownloadCancelledError(
                `Thread ${threadId}: Message cache is up-to-date`
            ));
        }

        if (dbCount > fbCount) {
            console.warn(`There are more messages in the cache (${dbCount}) than Facebook reports (${fbCount}). ` +
                `Will download the whole chat history.`);
            return Promise.resolve(fbCount);
        }

        const diff = fbCount - dbCount;
        console.log(`Thread ${threadId}: Message cache is ${diff} messages behind`);

        return Promise.resolve(diff);
    }

    static createUniqueIndexIfNotExists(dbCollection) {
        const msgIdIndexName = "messageID";
        const uniqueMsgIdIndex = {};
        uniqueMsgIdIndex[msgIdIndexName] = 1;

        return dbCollection.indexExists(msgIdIndexName)
            .then(() => Promise.resolve())
            .catch(err => dbCollection.createIndex(uniqueMsgIdIndex, { unique: true }));
    }

    static handleDuplicateKeysError(err, threadId) {
        if (err.code === 11000) {
            return console.warn(`Thread ${threadId}: There were one or more duplicate messages`);
        }

        throw err;
    }
}

class ThreadHistoryDownloadCancelledError extends Error {
    constructor(msg) {
        super(msg);
    }
}