import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import Configuration from "../config/Configuration";
import MongoClient from "mongodb";
import Db from "mongodb";
import Promise from "bluebird";
import AsyncResolvable from "../util/AsyncResolvable";

@Singleton
@Inject(Configuration)
export default class MongoConnector extends AsyncResolvable {
    constructor(config) {
        super(Db);

        this.connectionUrl = config.get("mongo.url");

        /**
         * @type {Db}
         */
        this.dbInstance = undefined;
    }

    /**
     * @return {Promise.<Db>}
     */
    connect() {
        return MongoClient.connect(this.connectionUrl, {
            promiseLibrary: Promise
        }).then(db => {
            this.dbInstance = db;
            return db;
        });
    }

    /**
     * @return {Promise.<Db>}
     */
    resolve() {
        return this.connect();
    }

    /**
     * @return {Promise}
     */
    disconnect() {
        return this.dbInstance.close(true);
    }
}