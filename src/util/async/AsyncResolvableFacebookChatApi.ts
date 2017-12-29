import { AsyncResolvable, ChatApi, ServiceIdentifier } from "botyo-api";
import { inject, injectable } from "inversify";
import FacebookLoginHelper from "../FacebookLoginHelper";

@injectable()
export default class AsyncResolvableFacebookChatApi implements AsyncResolvable<ChatApi>
{
    constructor(@inject(FacebookLoginHelper) private readonly facebookLoginHelper: FacebookLoginHelper) {}

    async resolve(): Promise<ChatApi>
    {
        return this.facebookLoginHelper.login();
    }

    getServiceIdentifier(): ServiceIdentifier<ChatApi>
    {
        return ChatApi.SYMBOL;
    }
}