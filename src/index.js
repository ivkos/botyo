import "source-map-support/register";
import { container as ApplicationIocContainer } from "needlepoint";
import Configuration from "./core/config/Configuration";
import Application from "./core/Application";

ApplicationIocContainer.registerInstance(
    Configuration,
    new Configuration("config.yaml")
);

Application.initialize();
