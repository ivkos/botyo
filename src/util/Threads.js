import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Configuration from "./Configuration";
import Bro from "brototype";

@Singleton
@Inject(Configuration)
export default class Threads {
    constructor(config) {
        this.threadIdToAliasToUserIdMapMap = Threads.buildThreadIdToAliasToUserIdMapMap(config.get("threads"));
    }

    /**
     * @return {Set.<number>}
     */
    getThreadIds() {
        const idSet = new Set();
        this.threadIdToAliasToUserIdMapMap.forEach((v, k) => idSet.add(k));
        return idSet;
    }

    getUserIdByThreadIdAndAlias(threadId, alias) {
        const aliasMap = this.threadIdToAliasToUserIdMapMap.get(parseInt(threadId));

        if (aliasMap === undefined) {
            return undefined;
        }

        // TODO: Implement similarity calculation
        return aliasMap.get(alias);
    }

    /**
     * @param {[]} threads
     * @return {Map}
     */
    static buildThreadIdToAliasToUserIdMapMap(threads) {
        const threadIdToAliasToUserIdMapMap = new Map();

        // Add simple threadId entries without properties
        threads
            .filter(t => !isNaN(t))
            .forEach(id => {
                threadIdToAliasToUserIdMapMap.set(parseInt(id), new Map());
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

                threadIdToAliasToUserIdMapMap.set(parseInt(threadId), aliasToUserIdMap);
            });

        return threadIdToAliasToUserIdMapMap;
    }
}