import { dependencies as Inject, container as ApplicationIocContainer } from "needlepoint";
import Configuration from "../config/Configuration";
import FilterModule from "../../modules/FilterModule";
import glob from "glob";
import Promise from "bluebird";

@Inject(Configuration)
export default class FilterChain {
    /**
     * @param {Configuration} config
     */
    constructor(config) {
        /**
         * Discover filters in modules/filters
         * Register them all as singletons
         * Get the filter-chain from config
         * Resolve by string
         *
         * !! Throw exceptions when something is wrong
         */

        const filterList = config.get("filter-chain");
        const instances = glob.sync("../../modules/filters/**/*.js", { cwd: __dirname })
            .map(fn => require(fn).default)
            .filter(clazz => clazz.prototype instanceof FilterModule)
            .filter(clazz => {
                const filterName = clazz.prototype.constructor.name;

                if (filterList.indexOf(filterName) === -1) {
                    console.info(`Filter ${filterName} is disabled`);
                    return false;
                }

                return true;
            })
            .map(clazz => {
                ApplicationIocContainer.registerAsSingleton(clazz);
                const instance = ApplicationIocContainer.resolveSingleton(clazz);

                console.log(`Registered filter ${instance.constructor.name}`);

                return instance;
            });

        /**
         * @type {Array.<FilterModule>}
         */
        this.orderedInstances = filterList.map(name => instances.find(i => i.constructor.name === name));
    }

    /**
     * @param {*} message
     * @return {Promise}
     */
    pass(message) {
        let promiseChain = Promise.resolve(message);

        for (let theFilter of this.orderedInstances) {
            promiseChain = promiseChain.then(msg => theFilter.filter(msg));
        }

        return promiseChain;
    }
}