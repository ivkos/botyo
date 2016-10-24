import FilterModule from "../FilterModule";
import { singleton as Singleton } from "needlepoint";

@Singleton
export default class TrimmingFilter extends FilterModule {
    filter(msg) {
        if (msg.body) {
            msg.body = msg.body.trim();
        }

        return msg;
    }
}