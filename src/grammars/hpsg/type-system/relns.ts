import { TypeSystem } from "../../../features/types.js";
import { LexemeInput } from "../lexicon/lexeme-input.js";

export function ensureRelnSubtype(types: TypeSystem, relnName: string): void {
    if (relnName === "reln") return;

    if (types.hasType(relnName)) {
        if (!types.isSubtype(relnName, "reln")) {
            throw new Error(`Type "${relnName}" already exists but is not a subtype of "reln".`);
        }
        return;
    }

    types.addType(relnName, "reln");
}

export function ensureLexemeInputRelns(types: TypeSystem, input: LexemeInput): void {
    for (const relnName of collectLexemeInputRelns(input)) {
        ensureRelnSubtype(types, relnName);
    }
}

function collectLexemeInputRelns(input: LexemeInput): Set<string> {
    const relns = new Set<string>();

    if (input.reln) {
        relns.add(input.reln);
    }

    if (input.type === "pron-lxm" && input.restr) {
        for (const predication of input.restr) {
            relns.add(predication.reln);
        }
    }

    return relns;
}
