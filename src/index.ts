import * as parser from "./core/parser.js";
import { CFG } from "./grammars/cfg/cfg.js";
import { HPSG } from "./grammars/hpsg/hpsg.js";

export { parser };

export const grammars = {
    CFG,
    HPSG,
};

export function helloSyntaxCore(): string {
    return "syntax-core is ready";
}
