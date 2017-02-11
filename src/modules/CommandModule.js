import Promise from "bluebird";

export default class CommandModule {
    /**
     * Returns the command this module acts on. This string should not include the escape sequence.
     *
     * @return {string} the command
     */
    getCommand() {
        return "command";
    }

    /**
     * Returns the description of the command.
     *
     * @return {string} the description
     */
    getDescription() {
        return "Does this and that";
    }

    /**
     * Returns a user-friendly description of the arguments this command accepts.
     * This is used in descriptions and error messages.
     *
     * @return {string}
     */
    getUsage() {
        return "[argument1] [argument2] ...";
    }

    /**
     * Validates the message containing the command. If this returns true, the execute() method will be invoked.
     * If this returns false, an error message with the correct usage of the command will be sent to the chat.
     *
     * @param {object} msg The received message object.
     * @param {string} argsString String containing everything after the command.
     *                            For example, if the message is "#quote me", this parameter will be "me".
     * @return {boolean} true if the command is valid and should be executed, false otherwise.
     */
    validate(msg, argsString) {
        return true;
    }

    /**
     * The method that gets executed when the received message is a valid command.
     *
     * @param {object} msg The received message object.
     * @param {string} argsString String containing everything after the command.
     *                            For example, if the message is "#quote me", this parameter will be "me".
     * @return {Promise.<T>}
     */
    execute(msg, argsString) {
        return Promise.resolve();
    }
}