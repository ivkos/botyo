import {
    ApplicationConfiguration,
    ChatThreadParticipantConsumer,
    ChatThreadUtils,
    Constants,
    FacebookId,
    Logger,
    Message
} from "botyo-api";
import { inject, injectable } from "inversify";
import * as _ from "lodash";
import * as stringSimilarity from "string-similarity";

const SIMILARITY_THRESHOLD = 0.5;

@injectable()
export default class ChatThreadUtilsImpl implements ChatThreadUtils
{
    constructor(@inject(ApplicationConfiguration.SYMBOL) private readonly appConfig: ApplicationConfiguration,
                @inject(Logger.SYMBOL) private readonly logger: Logger)
    {}

    getChatThreadIds(): FacebookId[]
    {
        return _.keys(this.appConfig.getProperty(Constants.CONFIG_KEY_CHAT_THREADS));
    }

    getNickname(threadId: FacebookId, participantId: FacebookId): string | undefined
    {
        return this.appConfig.getOrElse(
            `${Constants.CONFIG_KEY_CHAT_THREADS}[${threadId}].${Constants.CONFIG_KEY_PARTICIPANTS}[${participantId}].nickname`,
            undefined
        );
    }

    getNicknameByMessage(msg: Message): string | undefined
    {
        return this.getNickname(msg.threadID, msg.senderID);
    }

    getName(userId: FacebookId): string
    {
        let name;

        this.forEachParticipantInEachChatThread((threadId, participantVanityOrId, participantObj) => {
            if (participantVanityOrId == userId) {
                name = participantObj.name;
                return false; // breaks the iteration
            }
            return;
        });

        return name as any as string;
    }

    getNameByMessage(msg: Message): string
    {
        return this.getName(msg.senderID);
    }

    getFirstName(userId: FacebookId): string
    {
        let firstName;

        this.forEachParticipantInEachChatThread((threadId, participantVanityOrId, participantObj) => {
            if (participantVanityOrId == userId) {
                firstName = participantObj.firstName;
                return false; // breaks the iteration
            }
            return;
        });

        return firstName as any as string;
    }

    getFirstNameByMessage(msg: Message): string
    {
        return this.getFirstName(msg.senderID);
    }

    getParticipantIdByAddressee(threadId: FacebookId, addressee: string): FacebookId | undefined
    {
        let max: { userId: FacebookId | undefined, rating: number, match: string | undefined } = {
            userId: undefined,
            rating: 0,
            match: undefined
        };

        this.forEachParticipantInEachChatThread((currentThreadId, participantId, participantObj) => {
            if (currentThreadId !== threadId) return;
            if (!/^\d+$/.test(participantId as string)) return;

            function updateMaxIfRatingIsGreater(str: string)
            {
                const rating = stringSimilarity.compareTwoStrings(addressee, str);
                if (rating > max.rating) {
                    max.userId = participantId;
                    max.rating = rating;
                    max.match = str;
                }
            }

            if (participantObj.aliases) {
                participantObj.aliases.forEach(a => updateMaxIfRatingIsGreater(a));
            }

            if (participantObj.nickname) {
                updateMaxIfRatingIsGreater(participantObj.nickname);
            }

            updateMaxIfRatingIsGreater(participantObj.firstName);
            updateMaxIfRatingIsGreater(participantObj.name);

            if (participantObj.vanity) {
                updateMaxIfRatingIsGreater(participantObj.vanity);
            }
        });

        if (max.rating >= SIMILARITY_THRESHOLD) {
            this.logger.verbose(
                `Matched addressee '${addressee}' to '${max.match}' with ${max.rating.toFixed(2)} confidence`
            );

            return max.userId;
        }

        this.logger.warn(
            `Could not match addressee '${addressee}' to participant. ` +
            `Closest match was '${max.match}' with ${max.rating.toFixed(2)} confidence ` +
            `(< ${SIMILARITY_THRESHOLD.toFixed(2)})`
        );

        return undefined;
    }

    forEachParticipantInEachChatThread(consumer: ChatThreadParticipantConsumer): void | Promise<void>
    {
        if (!this.appConfig.hasProperty(Constants.CONFIG_KEY_CHAT_THREADS)) {
            this.appConfig.setProperty(Constants.CONFIG_KEY_CHAT_THREADS, {})
        }

        const chatThreadsObj = this.appConfig.getProperty(Constants.CONFIG_KEY_CHAT_THREADS);

        let promises: Promise<any>[] = [];

        for (let chatThreadId of _.keys(chatThreadsObj)) {
            chatThreadsObj[chatThreadId] = chatThreadsObj[chatThreadId] || {};

            if (!_.has(chatThreadsObj[chatThreadId], Constants.CONFIG_KEY_PARTICIPANTS)) {
                _.set(chatThreadsObj[chatThreadId], Constants.CONFIG_KEY_PARTICIPANTS, {});
            }

            const participantsObj = _.get(chatThreadsObj[chatThreadId], Constants.CONFIG_KEY_PARTICIPANTS);

            for (let participantVanityOrId of _.keys(participantsObj)) {
                const consumerResult = consumer(
                    chatThreadId,
                    participantVanityOrId,
                    participantsObj[participantVanityOrId],
                    participantsObj
                );

                if (consumerResult === false) break;
                if (consumerResult instanceof Promise) promises.push(consumerResult);
            }
        }

        if (promises.length === 0) return;
        return Promise.all(promises).then(() => {});
    }
}