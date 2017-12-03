import { Logger, LoggerInstance, transports } from "winston";

const Console = transports.Console;

export const LOGGER_NAME = Symbol.for("BOTYO_LOGGER_NAME");

namespace LoggingUtils
{
    export function createLogger(label: string = "Botyo", handleUncaughtExceptions = false): LoggerInstance
    {
        return new Logger({
            transports: [new Console({
                level: 'verbose',
                colorize: true,
                timestamp: true,
                label: label,
                handleExceptions: handleUncaughtExceptions,
                humanReadableUnhandledException: true
            })]
        });
    }
}

export default LoggingUtils;