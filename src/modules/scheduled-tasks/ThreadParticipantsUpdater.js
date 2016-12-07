import { dependencies as Inject, singleton as Singleton } from "needlepoint";
import ScheduledTask from "../ScheduledTask";
import Threads from "../../core/config/Threads";
import ChatApi from "../../core/api/ChatApi";
import Promise from "bluebird";

@Singleton
@Inject(Threads, ChatApi)
export default class ThreadParticipantsUpdater extends ScheduledTask {
    /**
     * @param {Threads} threads
     * @param {ChatApi} api
     */
    constructor(threads, api) {
        super();

        this.threads = threads;
        this.api = api;
    }

    execute() {
        const threadInfosPromise = this.threads
            .getThreadIds()
            .map(id => this.api.getThreadInfo(id).then(info => {
                info._threadId = id;
                return info;
            }));

        return Promise.all(threadInfosPromise)
            .then(threadInfos => threadInfos.map(info => {
                const threadId = info._threadId;

                if (info.nicknames && info.nicknames.length > 0) {
                    Object.keys(info.nicknames).forEach(userId =>
                        this.threads.setAlias(threadId, parseInt(userId), info.nicknames[userId])
                    );
                }

                return this.api.getUserInfo(info.participantIDs)
                    .then(info => Object.keys(info).map(k => [k, info[k]]).forEach(([userId, userInfo]) => {
                        [userInfo.name, userInfo.vanity]
                            .filter(alias => alias && alias.length > 0)
                            .forEach(alias => {
                                this.threads.setAlias(threadId, parseInt(userId), alias);
                            })
                    }))
            }))
            .all();
    }
}