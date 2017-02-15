import { dependencies as Inject } from "needlepoint";
import CommandModule from "../CommandModule";
import Configuration from "../../core/config/Configuration";
import ChatApi from "../../core/api/ChatApi";
import { V1 as Instagram } from "instagram-private-api";
import path from "path";
import findHashtags from "find-hashtags";
import Promise from "bluebird";

// http://blog.jstassen.com/2016/03/code-regex-for-instagram-username-and-hashtags/
const REGEX_USERNAME = /(?:@)([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)/;

@Inject(Configuration, ChatApi)
export default class InstagramCommand extends CommandModule {
    /**
     * @param {Configuration} config
     * @param {ChatApi} api
     */
    constructor(config, api) {
        super();
        this.config = config;
        this.api = api;

        this._initInstagram();
    }

    getCommand() {
        return "ig";
    }

    getDescription() {
        return "Posts Instagram photos of @user or ones tagged with #hashtag";
    }

    getUsage() {
        return "[latest] <@user | #hashtag>";
    }

    validate(msg, argsString) {
        return argsString &&
            (this.parseUsername(argsString) !== undefined || this.parseHashtag(argsString) !== undefined);
    }

    parseUsername(argsString) {
        const matches = argsString.match(REGEX_USERNAME);

        if (!(matches !== null && findHashtags(argsString).length == 0)) return;

        return matches[1];
    }

    parseHashtag(argsString) {
        const hashtags = findHashtags(argsString);

        if (!(hashtags.length > 0 && !REGEX_USERNAME.test(argsString))) return;

        return hashtags[0];
    }

    execute(msg, argsString) {
        const latest = argsString.startsWith("latest");

        const username = this.parseUsername(argsString);
        const hashtag = this.parseHashtag(argsString);

        if (username !== undefined && hashtag === undefined) {
            return this
                .getPhotoUrlByUsername(username, latest)
                .then(url => this.api.sendMessage({ url: url }, msg.threadID))
                .catch(Instagram.Exceptions.IGAccountNotFoundError,
                    () => this.api.sendMessage("No such Instagram user.", msg.threadID))
                .catch(Instagram.Exceptions.PrivateUserError,
                    () => this.api.sendMessage("User is private.", msg.threadID))
                .catch(EmptyResultsError,
                    () => this.api.sendMessage("No photos found.", msg.threadID));
        }

        if (hashtag !== undefined && username === undefined) {
            return this
                .getPhotoUrlByHashtag(hashtag, latest)
                .then(url => this.api.sendMessage({ url: url }, msg.threadID))
                .catch(EmptyResultsError, () => this.api.sendMessage("No photos found.", msg.threadID));
        }

        throw new Error("Illegal state.");
    }

    getPhotoUrlByHashtag(hashtag, latest) {
        return this.sessionPromise
            .then(() => new Instagram.Feed.TaggedMedia(this.session, hashtag).get())
            .then(media => media && media.length > 0
                ? this.pick(media, latest)
                : Promise.reject(new EmptyResultsError()))
            .then(photo => photo.params.webLink);
    }

    getPhotoUrlByUsername(username, latest) {
        return this
            .getUserByUsernameOrCloseEnough(username)
            .then(user => new Instagram.Feed.UserMedia(this.session, user.id).get())
            .then(media => media && media.length > 0
                ? this.pick(media, latest)
                : Promise.reject(new EmptyResultsError()))
            .then(photo => photo.params.webLink);
    }

    pick(collection, first) {
        if (!collection || collection.length === 0) return;

        return first ? collection[0] : collection[~~(Math.random() * collection.length)];
    }

    getUserByUsernameOrCloseEnough(username) {
        return this.sessionPromise
            .then(() => Instagram.Account.searchForUser(this.session, username))
            .then(user => [user])
            .catch(Instagram.Exceptions.IGAccountNotFoundError, () => Instagram.Account.search(this.session, username))
            .then(users => users && users.length > 0
                ? users[0]
                : Promise.reject(new Instagram.Exceptions.IGAccountNotFoundError()));
    }

    _initInstagram() {
        const username = this.config.getModuleConfig(this, "username");
        const password = this.config.getModuleConfig(this, "password");

        // Kinda hacky but for convenience save the state file in the same directory as the Facebook state file
        const instagramStateFile = path.join(
            path.parse(this.config.get("app.stateFile")).dir,
            "instagram.json"
        );

        const device = new Instagram.Device(username);
        const storage = new Instagram.CookieFileStorage(instagramStateFile);

        this.sessionPromise = Promise.resolve(Instagram.Session.create(device, storage, username, password));
        this.sessionPromise.then(session => this.session = session);
    }
}

class EmptyResultsError extends Error {
    constructor(msg) {
        super(msg);
    }
}