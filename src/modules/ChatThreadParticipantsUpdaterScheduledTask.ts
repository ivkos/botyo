import { ScheduledTaskModule } from "botyo-api";
import { inject } from "inversify";
import AsyncResolvableChatParticipantsResolver from "../util/async/AsyncResolvableChatParticipantsResolver";

export default class ChatThreadParticipantsUpdaterScheduledTask extends ScheduledTaskModule
{
    constructor(@inject(AsyncResolvableChatParticipantsResolver) private readonly resolver: AsyncResolvableChatParticipantsResolver)
    {
        super();
    }

    async execute(): Promise<void>
    {
        await this.resolver.populateActualParticipants();
        await this.resolver.populateParticipantsInfo();
    }

    shouldExecuteOnStart(): boolean
    {
        return false;
    }

    getSchedule(): string | number
    {
        return this.getRuntime().getConfiguration().getOrElse(
            ScheduledTaskModule.CONFIG_KEY_SCHEDULE,
            ChatThreadParticipantsUpdaterScheduledTask.DEFAULT_INTERVAL
        );
    }

    static readonly DEFAULT_INTERVAL = 10 * 60 * 1000;
}