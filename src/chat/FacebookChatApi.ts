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


export class FacebookChatApi extends ChatApi implements MessageListener
{
    private readonly facebookChatApiFnToPromisifiedFnMap: WeakMap<(...args: any[]) => any,
        (...args: any[]) => Promise<any>> = new WeakMap();

    constructor(private readonly facebookChatApi: any)
    {
        super();
    }

    listen(handler: MessageHandler): void
    {
        this.facebookChatApi.listen(handler);
    }

    async sendMessage(threadId: FacebookId, message: Message | string): Promise<Message>
    {
        return this.cachify(this.facebookChatApi.sendMessage)(message, threadId);
    }

    async changeThreadColor(threadId: FacebookId, color: string): Promise<void>
    {
        return this.cachify(this.facebookChatApi.changeThreadColor)(color, threadId);
    }

    async getThreadInfo(threadId: FacebookId): Promise<ThreadInfo>
    {
        return this.cachify(this.facebookChatApi.getThreadInfoGraphQL)(threadId);
    }

    async getThreadHistory(threadId: FacebookId, amount: number, timestamp?: number): Promise<Message[]>
    {
        return this.cachify(this.facebookChatApi.getThreadHistoryGraphQL)(threadId, amount, timestamp);
    }

    async sendTypingIndicator(threadId: FacebookId): Promise<EndTypingIndicatorFunction>
    {
        return new Promise<EndTypingIndicatorFunction>((resolve, reject) => {
            const endFn: (err: any) => void =
                this.facebookChatApi.sendTypingIndicator(threadId, (err: any) => {
                    if (err) return reject(err);
                    return resolve(this.makeEndTypingIndicatorFunction(endFn));
                });
        });
    }

    private makeEndTypingIndicatorFunction(originalEndFn: (err: any) => void): EndTypingIndicatorFunction
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
        return this.cachify(this.facebookChatApi.markAsRead)(threadId);
    }

    async getUserInfo(ids: FacebookId | FacebookId[]): Promise<UserInfoResult>
    {
        return this.cachify(this.facebookChatApi.getUserInfo)(ids);
    }

    async getUserId(name: string): Promise<UserIdSearchResult[]>
    {
        return this.cachify(this.facebookChatApi.getUserID)(name);
    }

    getCurrentUserId(): FacebookId
    {
        return parseInt(this.facebookChatApi.getCurrentUserID());
    }

    async handleMessageRequest(threadId: FacebookId, shouldAccept: boolean): Promise<void>
    {
        return this.cachify(this.facebookChatApi.handleMessageRequest)(threadId, shouldAccept);
    }

    async setMessageReaction(messageId: FacebookId, reaction: Reaction | string): Promise<void>
    {
        return this.cachify(this.facebookChatApi.setMessageReaction)(reaction, messageId);
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