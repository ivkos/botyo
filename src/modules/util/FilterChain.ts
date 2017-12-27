import { inject, injectable } from "inversify";
import ModuleRegistry from "../../util/ioc/ModuleRegistry";
import { Logger, Message } from "botyo-api";
import * as Bluebird from "bluebird";

@injectable()
export default class FilterChain
{
    constructor(@inject(ModuleRegistry) private readonly moduleRegistry: ModuleRegistry,
                @inject(Logger.SYMBOL) private readonly logger: Logger)
    {}

    async pass(msg: Message): Promise<void>
    {
        let currentMessage: Message | void = msg;

        for (let filterModule of this.moduleRegistry.getFilterModules()) {
            const isEnabled = filterModule.getRuntime()
                .getConfiguration().inContext(msg).ofParticipant()
                .isEnabled();

            if (!isEnabled) continue;

            try {
                currentMessage = await Bluebird.try(() => filterModule.filter(currentMessage));
            } catch (err) {
                this.logger.error("Filter chain broke due to an error", err);
                break;
            }

            if (currentMessage === undefined) break;
        }
    }
}