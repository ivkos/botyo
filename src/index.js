import "source-map-support/register";
import { container as ApplicationIocContainer } from "needlepoint";
import Configuration from "./core/config/Configuration";
import Application from "./core/Application";
import Promise from "bluebird";

Promise.config({ cancellation: true });

ApplicationIocContainer.registerInstance(
    Configuration,
    new Configuration("config.yaml")
);

Application.initialize();
