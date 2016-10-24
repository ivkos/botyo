export default class CommandModule {
    getCommand() {
        return "somecommand";
    }

    getDescription() {
        return "Does this and that";
    }

    getUsage() {
        return "[argument1] [argument2] ...";
    }

    validate(msg, argsString) {
        return true;
    }

    execute(msg, argsString) {
        return Promise.resolve();
    }
}