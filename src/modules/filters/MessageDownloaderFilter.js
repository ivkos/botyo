import FilterModule from "../FilterModule";
import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Db from "mongodb";
import Configuration from "../../util/Configuration";

@Singleton
@Inject(Db, Configuration)
export default class MessageDownloaderFilter extends FilterModule {
    constructor(db, config) {
        super();

        this.db = db;
        this.isEnabled = config.isModuleEnabled(this);
    }

    filter(msg) {
        if (!this.isEnabled) return msg;

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