import { dependencies as Inject, singleton as Singleton, container as ApplicationIocContainer } from "needlepoint";
import FilterModule from "../FilterModule";
import Configuration from "../../util/Configuration";
import ChatApi from "../../util/ChatApi";
import glob from "glob";

@Singleton
@Inject(Configuration, ChatApi)
export default class CommandExecutorFilter extends FilterModule {
    /**
     * @param {Configuration} config
     * @param {ChatApi} api
     */
    constructor(config, api) {
        super();

        this.config = config;
        this.api = api;
        this.escape = this.config.get("app.commandEscape");

        this.commandMap = new Map();
        glob.sync("../commands/*.js", { cwd: __dirname })
            .map(fn => require(fn).default)
            .map(m => ApplicationIocContainer.resolve(m))
            .forEach(m => {
                this.commandMap.set(m.getCommand(), m);
                console.log("Registered " + this.escape + m.getCommand());
            });
    }

    filter(msg) {
        if (!this.isCommand(msg)) {
            return msg;
        }

        const commandName = this.getCommandNameOfMessage(msg);

        if (commandName == "help") {
            this.api.sendMessage(this.getCommandList(), msg.threadID);
            return msg;
        }

        /**
         * @type {CommandModule}
         */
        const module = this.commandMap.get(commandName);
        if (module == undefined) {
            console.log("Could not find module for command " + this.escape + commandName);
            return msg;
        }

        const isValid = module.validate(msg, this.getArgsString(msg));
        if (!isValid) {
            const helpText = this.getHelpText(module);

            this.api.sendMessage("\u{26A0} Invalid syntax!\n\n" + helpText, msg.threadID);

            return msg;
        } else {
            module.execute(msg, this.getArgsString(msg))
                .catch(err => console.error(err));

            return msg;
        }
    }

    isCommand(msg) {
        return msg.body && msg.body.startsWith(this.escape);
    }

    getCommandNameOfMessage(msg) {
        const escapedCommand = msg.body.split(" ")[0];

        return escapedCommand.substring(escapedCommand.indexOf(this.escape) + this.escape.length);
    }

    getArgsString(msg) {
        const escapedCommand = msg.body.split(" ")[0];

        return msg.body.substring(msg.body.indexOf(escapedCommand) + escapedCommand.length).trim();
    }

    getHelpText(commandModuleInstance) {
        // #somecommand
        const escapedCommandName = this.escape + commandModuleInstance.getCommand();

        let msg = "\u{2139} " + escapedCommandName + " - " + commandModuleInstance.getDescription();
        msg += "\n";
        msg += "\u{1F527} Usage: ";
        msg += escapedCommandName + " " + commandModuleInstance.getUsage();

        return msg;
    }

    getCommandList() {
        let str = "\u{1F527} Command list:\n\n";

        this.commandMap.forEach((module, commandName) => {
            str += this.escape + commandName + " - " + module.getDescription() + "\n";
        });

        return str;
    }
}