import { BinaryRules, TerminalRules } from "../../core/parser.js";

export class CFG implements BinaryRules<string> {

    combine(left: string, right: string): { category: string; rule: string }[] {
        if (left === "NP" && right === "VP") return [{ category: "S", rule: "S → NP VP" }];
        if (left === "V" && right === "NP") return [{ category: "VP", rule: "VP → V NP" }];
        if (left === "Det" && right === "N") return [{ category: "NP", rule: "NP → Det N" }];
        if (left === "P" && right === "NP") return [{ category: "PP", rule: "PP → P NP" }];
        if (left === "VP" && right === "PP") return [{ category: "VP", rule: "VP → VP PP" }];
        if (left === "N" && right === "PP") return [{ category: "N", rule: "N → N PP" }];
        return [];
    }
}

const cfgCategories: Map<string, string> = new Map([
    ["john", "NP"],
    ["mary", "NP"],
    ["sees", "V"],
    ["girl", "N"],
    ["telescope", "N"],
    ["a", "Det"],
    ["with", "P"],
]);

export function createCFGTerminalRules(): TerminalRules<string> {
    return word => {
        const category = cfgCategories.get(word);
        return category ? [category] : [];
    };
}
