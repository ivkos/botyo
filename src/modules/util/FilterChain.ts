import { inject, injectable } from "inversify";
import ModuleRegistry from "../../util/ioc/ModuleRegistry";
import { Logger, Message } from "botyo-api";

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

            // wrap in promise in case dev forgets to declare filter() as async
            const filterPromise = new Promise((resolve, reject) => {
                try {
                    resolve(filterModule.filter(currentMessage))
                } catch (err) {
                    reject(err);
                }
            });

            try {
                currentMessage = await filterPromise;
            } catch (err) {
                this.logger.error("Filter chain broke due to an error", err);
                break;
            }

            if (currentMessage === undefined) break;
        }
    }
}