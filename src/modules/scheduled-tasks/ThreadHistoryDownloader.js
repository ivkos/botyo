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

        this.uniqueIndexName = "messageID";
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
                this.createUniqueIndexIfNotExists(dbCollection),
                dbCollection.count(),
                this.api.getThreadInfo(threadId).then(info => info.messageCount)
            ])
            .then(([_, dbCount, fbCount]) => this.handleMessageCount(dbCount, fbCount, threadId))
            .then(messageCount => this.batchDownloadMessages(messageCount, threadId, dbCollection))
            .catch(ThreadHistoryDownloadCancelledError, err => console.warn(err.message))
    }

    batchDownloadMessages(messageCount, threadId, dbCollection) {
        const msgsPerRequest = Math.min(messageCount, 500);

        let i = 0;
        let lastTimestamp = +Date.now();
        let downloadedMessageCount = 0;

        return new Promise((resolve, reject) => {
            until(
                () => (i * msgsPerRequest) >= messageCount,
                done => {
                    return this.api
                        .getThreadHistory(threadId, 0, msgsPerRequest, lastTimestamp)
                        .then(messages => {
                            downloadedMessageCount += messages.length;
                            lastTimestamp = parseInt(messages[0].timestamp) - 1;
                            i++;

                            return this.upsertMany(dbCollection, messages);
                        })
                        .then(({ upsertedCount }) => {
                            console.log(
                                `Thread ${threadId}: ` +
                                `Downloaded total ${downloadedMessageCount}/${messageCount} messages ` +
                                `(${upsertedCount} new)`
                            );

                            return done();
                        })
                        .catch(err => done(err));
                },
                err => {
                    if (err) return reject(err);
                    return resolve();
                });
        });
    }

    handleMessageCount(dbCount, fbCount, threadId) {
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

    createUniqueIndexIfNotExists(dbCollection) {
        const uniqueMsgIdIndex = {};
        uniqueMsgIdIndex[this.uniqueIndexName] = 1;

        return dbCollection.indexExists(this.uniqueIndexName)
            .then(() => Promise.resolve())
            .catch(err => dbCollection.createIndex(uniqueMsgIdIndex, { unique: true }));
    }

    upsertMany(dbCollection, messages) {
        const getFilter = msg => {
            const filter = {};
            filter[this.uniqueIndexName] = msg[this.uniqueIndexName];
            return filter;
        };

        const operations = messages.map(msg => ({
            updateOne: {
                filter: getFilter(msg),
                update: { $set: msg },
                upsert: true
            }
        }));

        return dbCollection.bulkWrite(operations, { ordered: false });
    }
}

class ThreadHistoryDownloadCancelledError extends Error {
    constructor(msg) {
        super(msg);
    }
}