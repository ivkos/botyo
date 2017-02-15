import { dependencies as Inject, singleton as Singleton, container as ApplicationIocContainer } from "needlepoint";
import FilterModule from "../FilterModule";
import Configuration from "../../core/config/Configuration";
import ChatApi from "../../core/api/ChatApi";
import glob from "glob";
import CommandModule from "../CommandModule";
import Promise from "bluebird";
import FriendlyErrorHandler from "../../core/api/FriendlyErrorHandler";

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

        this.commandNameToInstanceMap = new Map();
        glob.sync("../commands/**/*.js", { cwd: __dirname })
            .map(fn => require(fn).default)
            .filter(clazz => clazz.prototype instanceof CommandModule)
            .map(clazz => {
                if (!config.isModuleEnabled(clazz.prototype)) {
                    console.info(`Command ${clazz.constructor.name} is disabled`);
                    return null;
                }

                ApplicationIocContainer.registerAsSingleton(clazz);
                return ApplicationIocContainer.resolveSingleton(clazz);
            })
            .filter(i => i !== null)
            .forEach(instance => {
                this.commandNameToInstanceMap.set(instance.getCommand(), instance);
                console.log(`Registered command ${this.escape}${instance.getCommand()}`);
            });
    }

    filter(msg) {
        if (!this.isCommand(msg)) {
            return msg;
        }

        // Acknowledge receiving a command
        // Sending a receipt immediately after receiving a message
        // doesn't mark the last message as read for some reason, so delay it a bit
        setTimeout(() => this.api.markAsRead(msg.threadID), 333);

        const commandName = this.getCommandNameOfMessage(msg);

        if (commandName == "help") {
            this.api.sendMessage(this.getCommandList(), msg.threadID);
            return msg;
        }

        /**
         * @type {CommandModule}
         */
        const module = this.commandNameToInstanceMap.get(commandName);
        if (module == undefined) {
            console.warn("Could not find module for command " + this.escape + commandName);
            return msg;
        }

        const isValid = module.validate(msg, this.getArgsString(msg));
        if (!isValid) {
            const helpText = this.getHelpText(module);

            this.api.sendMessage("\u{26A0} Invalid syntax!\n\n" + helpText, msg.threadID);

            return msg;
        } else {
            // Send typing indicator to thread, showing progress for long-running commands
            const endTypingIndicatorFnPromise = this.api.sendTypingIndicator(msg.threadID);

            new Promise(resolve => resolve(module.execute(msg, this.getArgsString(msg))))
                .catch(err => FriendlyErrorHandler.handle(err, msg))
                .catch(err => console.error(err))
                .finally(() => endTypingIndicatorFnPromise.then(endFn => endFn()));

            return msg;
        }
    }

    isCommand(msg) {
        return msg.body && msg.body.startsWith(this.escape);
    }

    getCommandNameOfMessage(msg) {
        const escapedCommand = msg.body.split(/\s+/)[0];

        return escapedCommand.substring(escapedCommand.indexOf(this.escape) + this.escape.length);
    }

    getArgsString(msg) {
        const escapedCommand = msg.body.split(/\s+/)[0];

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

        this.commandNameToInstanceMap.forEach((module, commandName) => {
            str += this.escape + commandName + " - " + module.getDescription() + "\n";
        });

        return str;
    }
}