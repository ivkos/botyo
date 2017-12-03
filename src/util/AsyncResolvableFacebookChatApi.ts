import { ApplicationConfiguration, AsyncResolvable, ChatApi, Logger } from "botyo-api";
import { inject, injectable, interfaces } from "inversify";
import * as fs from "fs";
import { FacebookChatApi } from "../chat/FacebookChatApi";
import { LoggerInstance } from "winston";
import ServiceIdentifier = interfaces.ServiceIdentifier;

const fbLogin = require('facebook-chat-api');

@injectable()
export default class AsyncResolvableFacebookChatApi extends AsyncResolvable<ChatApi>
{
    private readonly cookiesFilePath: string;

    constructor(@inject(ApplicationConfiguration) private readonly applicationConfiguration: ApplicationConfiguration,
                @inject(Logger) private readonly logger: LoggerInstance)
    {
        super();
        this.cookiesFilePath = this.getCookiesFilePath();
    }

    async resolve(): Promise<ChatApi>
    {
        return new Promise<ChatApi>((doResolve, reject) => {
            this.logger.info("Logging in...");

            fbLogin(this.makeLoginOptions(), { logLevel: "silent" }, (err: any, api: any) => {
                if (err) {
                    if (err.error === "login-approval") {
                        const waitTime = this.applicationConfiguration.getOrElse(
                            AsyncResolvableFacebookChatApi.CONFIG_FACEBOOK_APPROVAL_TIMEOUT,
                            AsyncResolvableFacebookChatApi.CONFIG_FACEBOOK_APPROVAL_TIMEOUT_DEFAULT
                        );

                        this.logger.warn(
                            `You need to approve this login from a device you have previously logged in on. ` +
                            `You have ${waitTime}s to do this.`
                        );

                        setTimeout(() => err.continue(), waitTime * 1000);

                        return;
                    }

                    return reject(err);
                }

                this.removePasswordFromConfiguration();
                this.configureApi(api);
                this.persistAppState(api);

                this.logger.info("Logged in successfully");

                return doResolve(new FacebookChatApi(api));
            });
        });
    };

    getServiceIdentifier(): ServiceIdentifier<ChatApi>
    {
        return ChatApi;
    };

    private removePasswordFromConfiguration()
    {
        this.applicationConfiguration.setProperty(AsyncResolvableFacebookChatApi.CONFIG_FACEBOOK_PASSWORD, "");
    }

    private persistAppState(api: any)
    {
        this.logger.info("Saving Facebook session...");
        fs.writeFileSync(this.cookiesFilePath, JSON.stringify(api.getAppState()));
    }

    private configureApi(api: any)
    {
        api.setOptions({
            selfListen: this.applicationConfiguration.getOrElse(
                AsyncResolvableFacebookChatApi.CONFIG_FACEBOOK_SELF_LISTEN,
                AsyncResolvableFacebookChatApi.CONFIG_FACEBOOK_SELF_LISTEN_DEFAULT
            )
        });
    }

    private makeLoginOptions(): {}
    {
        const loginData: any = {};

        if (this.isAppStateAvailable()) {
            this.logger.info("Logging in using the stored Facebook session...");
            loginData.appState = JSON.parse(fs.readFileSync(this.cookiesFilePath, 'utf-8'));
        } else {
            this.logger.info("Logging in with a new session...");

            loginData.email = this.applicationConfiguration
                .getProperty(AsyncResolvableFacebookChatApi.CONFIG_FACEBOOK_EMAIL);

            loginData.password = this.applicationConfiguration
                .getProperty(AsyncResolvableFacebookChatApi.CONFIG_FACEBOOK_PASSWORD);
        }

        return loginData;
    }

    private getCookiesFilePath(): string
    {
        return this.applicationConfiguration.getOrElse(
            AsyncResolvableFacebookChatApi.CONFIG_COOKIES_FILE,
            AsyncResolvableFacebookChatApi.CONFIG_COOKIES_FILE_DEFAULT
        );
    }

    private isAppStateAvailable(): boolean
    {
        return fs.existsSync(this.getCookiesFilePath());
    }

    static readonly CONFIG_COOKIES_FILE = "facebook.cookiesFile";
    static readonly CONFIG_COOKIES_FILE_DEFAULT = "cookies.json";

    static readonly CONFIG_FACEBOOK_EMAIL = "facebook.email";
    static readonly CONFIG_FACEBOOK_PASSWORD = "facebook.password";

    static readonly CONFIG_FACEBOOK_APPROVAL_TIMEOUT = "facebook.approvalTimeout";
    static readonly CONFIG_FACEBOOK_APPROVAL_TIMEOUT_DEFAULT = 30;

    static readonly CONFIG_FACEBOOK_SELF_LISTEN = "facebook.selfListen";
    static readonly CONFIG_FACEBOOK_SELF_LISTEN_DEFAULT = false;
}