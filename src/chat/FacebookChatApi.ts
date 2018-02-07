import * as Bluebird from "bluebird";
import {
    ChatApi,
    EndTypingIndicatorFunction,
    FacebookId,
    Message,
    MessageHandler,
    MessageListener,
    Reaction,
    ThreadInfo,
    UserIdSearchResult,
    UserInfoResult
} from "botyo-api";
import FacebookLoginHelper from "../util/FacebookLoginHelper";


export class FacebookChatApi implements ChatApi, MessageListener
{
    private readonly facebookChatApiFnToPromisifiedFnMap: WeakMap<(...args: any[]) => any,
        (...args: any[]) => Promise<any>> = new WeakMap();

    private loginPromise?: Bluebird<ChatApi>;
    private handler?: MessageHandler;

    constructor(private facebookChatApi: any, private readonly facebookLoginHelper: FacebookLoginHelper) {}

    listen(handler: MessageHandler): void
    {
        this.handler = handler;
        this.facebookChatApi.listen(handler);
    }

    async sendMessage(threadId: FacebookId, message: Message | string): Promise<Message>
    {
        return this.wrap(this.facebookChatApi.sendMessage)(message, threadId);
    }

    async changeThreadColor(threadId: FacebookId, color: string): Promise<void>
    {
        return this.wrap(this.facebookChatApi.changeThreadColor)(color, threadId);
    }

    async getThreadInfo(threadId: FacebookId): Promise<ThreadInfo>
    {
        return this.wrap(this.facebookChatApi.getThreadInfoGraphQL)(threadId);
    }

    async getThreadHistory(threadId: FacebookId, amount: number, timestamp?: number): Promise<Message[]>
    {
        return this.wrap(this.facebookChatApi.getThreadHistoryGraphQL)(threadId, amount, timestamp);
    }

    async sendTypingIndicator(threadId: FacebookId): Promise<EndTypingIndicatorFunction>
    {
        let endFn: (cb: (err: any) => void) => void = (fn: Function) => { fn(); };

        await new Promise<any>((resolve, reject) => {
            endFn = this.facebookChatApi.sendTypingIndicator(threadId, (err: any) => {
                if (err) return reject(err);
                return resolve();
            })
        });

        return this.makeEndTypingIndicatorFunction(endFn);
    }

    private makeEndTypingIndicatorFunction(originalEndFn: (cb: (err: any) => void) => void): EndTypingIndicatorFunction
    {
        return () => new Promise<void>((resolve, reject) => {
            originalEndFn((err: any) => {
                if (err) return reject(err);
                return resolve();
            });
        });
    }

    async markAsRead(threadId: FacebookId): Promise<void>
    {
        return this.wrap(this.facebookChatApi.markAsRead)(threadId);
    }

    async getUserInfo(ids: FacebookId | FacebookId[]): Promise<UserInfoResult>
    {
        return this.wrap(this.facebookChatApi.getUserInfo)(ids);
    }

    async getUserId(name: string): Promise<UserIdSearchResult[]>
    {
        return this.wrap(this.facebookChatApi.getUserID)(name);
    }

    getCurrentUserId(): FacebookId
    {
        return parseInt(this.facebookChatApi.getCurrentUserID());
    }

    async handleMessageRequest(threadId: FacebookId, shouldAccept: boolean): Promise<void>
    {
        return this.wrap(this.facebookChatApi.handleMessageRequest)(threadId, shouldAccept);
    }

    async setMessageReaction(messageId: FacebookId, reaction: Reaction | string): Promise<void>
    {
        return this.wrap(this.facebookChatApi.setMessageReaction)(reaction, messageId);
    }

    async resolvePhotoUrl(photoId: FacebookId): Promise<string>
    {
        return this.wrap(this.facebookChatApi.resolvePhotoUrl)(photoId);
    }

    private wrap(fn: (...args: any[]) => any): (...args: any[]) => Promise<any>
    {
        return this.attachReloginErrorHandler(this.cachify(fn));
    }

    /**
     * Handles the "errorSummary=Sorry, something went wrong, errorDescription=Please try closing and re-opening
     * your browser window." error that persists after the bot has been logged in for a long period of time
     */
    private attachReloginErrorHandler(fn: (...args: any[]) => Promise<any>): (...args: any[]) => Promise<any>
    {
        const self = this;

        return {
            [fn.name || "fn"]: function () {
                const args = arguments;

                return fn.apply(self, args).catch((err: any) => {
                    if (err.error == 1357004) {
                        if (!self.loginPromise) {
                            self.facebookChatApi.logout(() => {});

                            self.loginPromise = Bluebird.resolve(self.facebookLoginHelper.login());

                            self.loginPromise.then((api: ChatApi) => {
                                self.facebookChatApi = api;

                                if (self.handler) {
                                    self.listen(self.handler);
                                }
                            });
                        }

                        const promise = self.loginPromise.then(() => fn.apply(self, args));

                        self.loginPromise.finally(() => { self.loginPromise = undefined });

                        return promise;
                    }

                    throw err;
                });
            }
        }[fn.name || "fn"];
    }

    private cachify(fn: (...args: any[]) => any): (...args: any[]) => Promise<any>
    {
        let promisifiedFn = this.facebookChatApiFnToPromisifiedFnMap.get(fn);

        if (promisifiedFn === undefined) {
            promisifiedFn = Bluebird.promisify(fn) as any;
            this.facebookChatApiFnToPromisifiedFnMap.set(fn, promisifiedFn as any);
        }

        return promisifiedFn as any;
    }
}