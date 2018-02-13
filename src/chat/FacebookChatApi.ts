import * as Bluebird from "bluebird";
import {
    ChatApi,
    EndTypingIndicatorFunction,
    FacebookId,
    Logger,
    Message,
    MessageHandler,
    MessageListener,
    Reaction,
    StopListeningFunction,
    ThreadInfo,
    UserIdSearchResult,
    UserInfoResult
} from "botyo-api";
import FacebookLoginHelper from "../util/FacebookLoginHelper";
import LoggingUtils from "../util/logging/LoggingUtils";


export class FacebookChatApi implements ChatApi, MessageListener
{
    private readonly facebookChatApiFnToPromisifiedFnMap: Map<(...args: any[]) => any,
        (...args: any[]) => Promise<any>> = new Map();

    private loginPromise?: Bluebird<ChatApi>;
    private handler?: MessageHandler;
    private stopListeningFn?: StopListeningFunction;
    private readonly logger: Logger = LoggingUtils.createLogger(FacebookChatApi.name);

    constructor(private facebookChatApi: any, private readonly facebookLoginHelper: FacebookLoginHelper) {}

    listen(handler: MessageHandler): StopListeningFunction
    {
        this.handler = handler;
        return (this.stopListeningFn = this.facebookChatApi.listen(handler));
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
                        self.logger.warn("Caught error that requires relogin. Recovering...");

                        if (!self.loginPromise) {
                            if (self.stopListeningFn && typeof self.stopListeningFn === "function") {
                                self.stopListeningFn();
                                self.logger.info("Stopped listening on old facebook-chat-api instance");
                            } else {
                                self.logger.error(
                                    "Could not stop listening on old facebook-chat-api instance. " +
                                    "This may cause messages to be handled more than once"
                                );
                            }

                            self.facebookChatApi.logout((err: any) => {
                                if (err) return self.logger.warn("Logout failed on old facebook-chat-api instance", err);
                                return self.logger.info("Logged out successfully on old facebook-chat-api instance");
                            });

                            self.loginPromise = Bluebird.resolve(self.facebookLoginHelper.login());

                            self.loginPromise.then((api: FacebookChatApi) => {
                                self.facebookChatApi = api.facebookChatApi;
                                self.facebookChatApiFnToPromisifiedFnMap.clear();

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