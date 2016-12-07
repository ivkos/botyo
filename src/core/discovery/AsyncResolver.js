import { container as ApplicationIocContainer } from "needlepoint";
import Promise from "bluebird";
import AsyncResolvable from "./AsyncResolvable";

export default class {
    constructor() {
        throw new Error("Do not instantiate AsyncResolver");
    }

    static resolve(...resolvables) {
        return Promise
            .resolve(resolvables)
            .then(deps => {
                const isResolvable = deps.every(dep => {
                    if (!(dep.prototype instanceof AsyncResolvable)) {
                        console.error(`${dep.name} is not AsyncResolvable`);
                        return false;
                    }

                    return true;
                });

                return isResolvable
                    ? Promise.resolve(deps)
                    : Promise.reject("One or more of the dependencies could not be resolved.");
            })
            .then(deps => deps.map(dep => ApplicationIocContainer.resolve(dep)))
            .then(deps => deps.map(dep => dep.getResolvableResult()))
            .all()
            .then(resolvableResults => resolvableResults.forEach(rr =>
                ApplicationIocContainer.registerInstance(rr.getType(), rr.getResult())
            ))
    }
}