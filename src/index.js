import "source-map-support/register";
import { container as ApplicationIocContainer } from "needlepoint";
import Configuration from "./util/Configuration";
import FacebookClient from "./util/FacebookClient";
import Application from "./util/Application";
import MongoConnector from "./util/MongoConnector";
import Promise from "bluebird";
import AsyncResolvable from "./util/AsyncResolvable";

ApplicationIocContainer.registerInstance(
    Configuration,
    new Configuration("config.yaml")
);

Promise
    .all([
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
    .then(deps => deps.map(dep => dep.resolve()))
    .all()
    .then(instances => instances.forEach(i => ApplicationIocContainer.registerInstance(i.constructor, i)))
    .then(() => ApplicationIocContainer.resolve(Application).start())
    .catch((err) => console.error(err));
