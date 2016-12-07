import "source-map-support/register";
import { container as ApplicationIocContainer } from "needlepoint";
import Configuration from "./core/config/Configuration";
import FacebookClient from "./core/api/FacebookClient";
import Application from "./core/Application";
import MongoConnector from "./core/db/MongoConnector";
import Promise from "bluebird";
import AsyncResolvable from "./core/util/AsyncResolvable";

ApplicationIocContainer.registerInstance(
    Configuration,
    new Configuration("config.yaml")
);

Promise
    .resolve([
        MongoConnector,
        FacebookClient,
    ])
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
    .then(() => ApplicationIocContainer.resolve(Application).start())
    .catch((err) => console.error(err));
