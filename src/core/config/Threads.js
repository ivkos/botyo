import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Configuration from "./Configuration";
import Bro from "brototype";
import stringSimilarity from "string-similarity";

@Singleton
@Inject(Configuration)
export default class Threads {
    constructor(config) {
        this.threadIdToAliasToUserIdMapMap = new Map();
        this.populateAliasesFromConfiguration(config.get("threads"));
    }

    /**
     * Returns a list of threadIds the bot is listening to.
     *
     * @return {Array.<number>}
     */
    getThreadIds() {
        const idList = [];
        this.threadIdToAliasToUserIdMapMap.forEach((v, k) => idList.push(k));
        return idList;
    }

    /**
     * Returns the id of the user specified by the threadId and their alias.
     *
     * @param {number} threadId
     * @param {string} alias
     * @return {number|undefined} the userId or undefined if nobody is found
     */
    getUserIdByThreadIdAndAlias(threadId, alias) {
        const aliasToUserIdMap = this.threadIdToAliasToUserIdMapMap.get(parseInt(threadId));

        if (aliasToUserIdMap === undefined) {
            return undefined;
        }

        const mostSimilar = this.getAliasesByThreadId(parseInt(threadId))
            .map(o => {
                o.similarity = stringSimilarity.compareTwoStrings(o.alias, alias);
                return o;
            })
            .filter(o => o.similarity >= 0.14) // TODO Externalize threshold
            .sort((o1, o2) => o2.similarity - o1.similarity)[0];

        return mostSimilar ? parseInt(mostSimilar.userId) : undefined;
    }

    /**
     * Adds an alias.
     *
     * @param {number} threadId
     * @param {number} userId
     * @param {string} alias
     */
    setAlias(threadId, userId, alias) {
        threadId = parseInt(threadId);
        userId = parseInt(userId);

        let aliasToUserIdMap = this.threadIdToAliasToUserIdMapMap.get(threadId);
        if (!aliasToUserIdMap) {
            this.threadIdToAliasToUserIdMapMap.set(threadId, new Map());
            aliasToUserIdMap = this.threadIdToAliasToUserIdMapMap.get(threadId);
        }

        aliasToUserIdMap.set(alias, userId);
    }

    /**
     * Returns a list of the aliases for the specified thread.
     *
     * @param {number} threadId
     * @return {Array}
     */
    getAliasesByThreadId(threadId) {
        const entries = [];

        for (let [k, v] of this.threadIdToAliasToUserIdMapMap.get(parseInt(threadId))) {
            entries.push({
                alias: k,
                userId: v
            });
        }

        return entries;
    }

    /**
     * @param {[]} threads
     */
    populateAliasesFromConfiguration(threads) {
        // Add simple threadId entries without properties
        threads
            .filter(t => !isNaN(t))
            .forEach(id => {
                this.threadIdToAliasToUserIdMapMap.set(parseInt(id), new Map());
            });

        // Add entries with properties such as aliases
        threads
            .filter(t => isNaN(t))
            .map(threadObj => new Bro(threadObj))
            .forEach(bro => {
                const threadId = bro.giveMeProps()[0];
                const aliasToUserIdMap = new Map();

                bro.doYouEven("aliases", aliases => aliases
                    .map(userIdObj => new Bro(userIdObj))
                    .forEach(bro => {
                        const userId = bro.giveMeProps()[0];
                        const aliasesForUserId = bro.iCanHaz(userId);

                        aliasesForUserId.forEach(alias => {
                            aliasToUserIdMap.set(alias, parseInt(userId));
                        });
                    })
                );

                this.threadIdToAliasToUserIdMapMap.set(parseInt(threadId), aliasToUserIdMap);
            });
    }
}