import { dependencies as Inject } from "needlepoint";
import CommandModule from "../CommandModule";
import ChatApi from "../../core/api/ChatApi";
import Promise from "bluebird";
import Parse from "parse/node";
import tmp from "tmp";
import * as fs from "fs";
import * as url from "url";
import * as path from "path";
import request from "request";

@Inject(ChatApi)
export default class AnotherOneCommand extends CommandModule {
    /**
     * @param {ChatApi} api
     */
    constructor(api) {
        super();
        this.api = api;

        // http://www.theydontwantyouto.win/js/main.js
        Parse.initialize("P3LSv7T9Dd9IoiGDddKEeqe5oFUFA8lX3quSmEHz", "a8tttLImbx5xJRpc5HVB5F7s6bD29a4NLFrgYEac");

        this.entitiesCache = [];
        this.updateEntitiesCache();
    }


    getCommand() {
        return "anotherone";
    }

    getDescription() {
        return "Responds with a DJ Khaled audio quote"
    }

    getUsage() {
        return ""
    }

    validate(msg, argsString) {
        return true;
    }

    execute(msg, argsString) {
        const quote = this.getAnotherOne();

        if (!quote) return this.api.sendMessage("Sorry, something went wrong. :/", msg.threadID);

        return Promise.all([
            AnotherOneCommand.downloadTmpFile(quote.img),
            AnotherOneCommand.downloadTmpFile(quote.file)
        ]).then(([img, audio]) => {
            const imgPromise = this.api.sendMessage({ attachment: img.readStream }, msg.threadID)
                .finally(() => fs.unlink(img.tmpFilePath));

            const audioPromise = this.api.sendMessage({ attachment: audio.readStream }, msg.threadID)
                .finally(() => fs.unlink(audio.tmpFilePath));

            return Promise.all([imgPromise, audioPromise]);
        });
    }

    updateEntitiesCache() {
        return new Parse.Query(Parse.Object.extend("audio"))
            .exists("file")
            .exists("text")
            .exists("img")
            .find({ success: res => this.entitiesCache = res })
    }

    /**
     * @returns {{file, img, text}}
     */
    getAnotherOne() {
        const randomResult = this.entitiesCache[~~(Math.random() * this.entitiesCache.length)];

        if (!randomResult) return undefined;

        return {
            file: randomResult.get('file').url(),
            img: randomResult.get('img').url(),
            text: randomResult.get('text')
        };
    }

    /**
     * @param {string} url
     * @return {Promise.<{tmpFilePath, readStream}>}
     */
    static downloadTmpFile(url) {
        return AnotherOneCommand.createTmpFile(url)
            .then(path => {
                return new Promise((resolve, reject) =>
                    request.get(url)
                        .on('error', err => reject(err))
                        .pipe(fs.createWriteStream(path))
                        .on('close', () => resolve())
                ).then(() => ({
                    tmpFilePath: path,
                    readStream: fs.createReadStream(path)
                }));
            });
    }

    /**
     * @param {string} theUrl
     * @return {Promise.<string>} path of tmp file
     */
    static createTmpFile(theUrl) {
        return new Promise((resolve, reject) => {
            const pathname = url.parse(theUrl).pathname;
            const extension = path.extname(pathname);

            return tmp.tmpName({ postfix: extension }, (err, path) => {
                if (err) return reject(err);
                return resolve(path);
            });
        });
    }
}