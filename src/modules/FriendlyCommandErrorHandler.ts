import { CommandErrorHandlerModule, CommandModule, Message } from "botyo-api";

export default class FriendlyCommandErrorHandler extends CommandErrorHandlerModule
{
    async handle(err: Error, message: Message, commandModule: CommandModule): Promise<void>
    {
        const firstName = this.getRuntime().getChatThreadUtils().getFirstNameByMessage(message);

        return this.getRuntime().getChatApi().sendMessage(
            message.threadID,
            `Sorry, ${firstName}. Something went wrong. :/`
        );
    }
}