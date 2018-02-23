import { AbstractCommandErrorHandlerModule, CommandModule, Message } from "botyo-api";

export default class FriendlyCommandErrorHandler extends AbstractCommandErrorHandlerModule
{
    async handle(err: Error, message: Message, commandModule: CommandModule): Promise<void>
    {
        const firstName = this.getRuntime().getChatThreadUtils().getFirstNameByMessage(message);

        const sorryText = firstName ? `Sorry, ${firstName}` : "Sorry";

        return this.getRuntime().getChatApi().sendMessage(
            message.threadID,
            `${sorryText}. Something went wrong. :/`
        );
    }
}