import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Configuration from "./Configuration";
import Bro from "brototype";

@Singleton
@Inject(Configuration)
export default class Aliases {
    constructor(config) {
        this.aliasesMap = Aliases.buildAliasesMap(config.get("threads"));
    }

    getUserIdByThreadIdAndAlias(threadId, alias) {
        const aliasMap = this.aliasesMap.get(parseInt(threadId));

        if (aliasMap === undefined) {
            return undefined;
        }

        // TODO: Implement similarity calculation
        return aliasMap.get(alias);
    }

    static buildAliasesMap(threads) {
        const threadIdToAliasToUserIdMapMap = new Map();

        threads
            .map(threadObj => new Bro(threadObj))
            .forEach(bro => {
                if (!bro.doYouEven("aliases")) {
                    return;
                }

                const threadId = bro.giveMeProps()[0];
                const aliasToUserIdMap = new Map();

                bro.iCanHaz("aliases")
                    .map(userIdObj => new Bro(userIdObj))
                    .forEach(bro => {
                        const userId = bro.giveMeProps()[0];
                        const aliasesForUserId = bro.iCanHaz(userId);

                        aliasesForUserId.forEach(alias => {
                            aliasToUserIdMap.set(alias, parseInt(userId));
                        });
                    });

                threadIdToAliasToUserIdMapMap.set(parseInt(threadId), aliasToUserIdMap);
            });

        return threadIdToAliasToUserIdMapMap;
    }
}