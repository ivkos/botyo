import FilterModule from "../FilterModule";
import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Db from "mongodb";

@Singleton
@Inject(Db)
export default class MessageDownloaderFilter extends FilterModule {
    constructor(db) {
        super();

        this.db = db;
    }

    filter(msg) {
        const threadId = parseInt(msg.threadID);

        this.db
            .collection(`thread-${threadId}`)
            .insertOne(msg)
            .catch(err => {
                console.warn(`Error ${err.code} while writing message to db`);
            });

        return msg;
    }
}