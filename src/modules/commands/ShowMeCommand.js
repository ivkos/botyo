import { dependencies as Inject } from "needlepoint";
import Configuration from "../../util/Configuration";
import CommandModule from "../CommandModule";
import ChatApi from "../../util/ChatApi";
import ImagesClient from "google-images";
import Promise from "bluebird";
import request from "request";
import tmp from "tmp";
import * as fs from "fs";
import * as url from "url";
import * as path from "path";
import mime from "mime-types";

@Inject(Configuration, ChatApi)
export default class ShowMeCommand extends CommandModule {
    constructor(config, api) {
        super();

        this.config = config;
        this.api = api;

        this.defaultImageCount = this.config.get("modules.showme.defaultImageCount");
        this.maxImageCount = this.config.get("modules.showme.maxImageCount");

        this.imagesClient = new ImagesClient(
            this.config.get("modules.showme.cseId"),
            this.config.get("modules.showme.cseApiKey")
        );
    }

    getCommand() {
        return "showme";
    }

    getDescription() {
        return "Returns the first few images found in Google Images matching the query";
    }

    getUsage() {
        return "[numberOfImages] <query>";
    }

    validate(msg, argsString) {
        if (!argsString) return false;

        const opts = this.parseArgsString(argsString);
        if (!opts) return false;
        if (!opts.query) return false;

        return true;
    }

    execute(msg, query) {
        let endFn;
        let tempFilesList = [];

        const opts = this.parseArgsString(query);

        return new Promise(resolve => {
            endFn = this.api.sendTypingIndicator(msg.threadID, () => resolve())
        })
            .then(() => this.getImageUrls(opts.query, opts.imageCount))
            .catch(err => {
                this.api.sendMessage("Sorry, something went wrong with the Google Images query. \u{1F615}", msg.threadID);
                throw err;
            })
            .then(urls => this.createTempFilesForUrls(urls).then(paths => {
                tempFilesList = paths;

                const writeStreams = paths.map(path => fs.createWriteStream(path));

                const completionPromises = urls.map((url, i) =>
                    new Promise((resolve, reject) =>
                        request.get(url)
                            .on('error', err => reject(err))
                            .pipe(writeStreams[i])
                            .on('close', () => resolve())
                    ));

                return Promise
                    .all(completionPromises)
                    .catch(err => {
                        this.api.sendMessage("Sorry, I couldn't download one or more of the images. \u{1F615}", msg.threadID);
                        throw err;
                    })
                    .then(() => paths.map(path => fs.createReadStream(path)));
            }))
            .then(streams => ({
                attachment: streams
            }))
            .then(theMessage => this.api.sendMessage(theMessage, msg.threadID))
            .catch(err => {
                this.api.sendMessage("Sorry, I couldn't send you one or more of the images. \u{1F615}", msg.threadID);
                throw err;
            })
            .finally(() => {
                if (typeof endFn == "function") {
                    endFn();
                }

                tempFilesList.forEach(path => fs.unlink(path));
            });
    }

    getImageUrls(query, imageCount) {
        return this.imagesClient.search(query)
            .then(images => images
                .slice(0, imageCount)
                .map(i => i.url)
            );
    }

    createTempFilesForUrls(urls) {
        const promises = urls.map(theUrl => {
            const pathname = url.parse(theUrl).pathname;
            const mimeType = mime.lookup(pathname);
            let extension = path.extname(pathname);

            // fallback to jpg if the extension is missing or not one for an image
            if (!mimeType || mimeType.split("/")[0] != "image") {
                extension = ".jpg";
            }

            return new Promise((resolve, reject) =>
                tmp.tmpName({
                    postfix: extension
                }, (err, path) => {
                    if (err) return reject(err);

                    return resolve(path);
                }))
        });

        return Promise.all(promises);
    }

    parseArgsString(argsString) {
        const m = argsString.match(/(\d+)\b(.*)|(.+)/);
        if (m === null) return undefined;

        const query = (m[2] || m[3] || m[1]).trim();
        const parsedImageCount = parseInt(m[2] ? m[1] : this.defaultImageCount);
        const normalizedImageCount = parsedImageCount <= 0 || parsedImageCount > this.maxImageCount
            ? this.defaultImageCount
            : parsedImageCount;

        return {
            query: query,
            imageCount: normalizedImageCount
        };
    }
}
