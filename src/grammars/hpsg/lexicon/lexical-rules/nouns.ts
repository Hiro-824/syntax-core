import { FeatureStructure } from "../../../../features/features.js";
import { TypeSystem } from "../../../../features/types.js";
import { setHeadAgr } from "../agr.js";

function buildWordFromLexeme(lexeme: FeatureStructure, types: TypeSystem): FeatureStructure {
    const word = new FeatureStructure("word");
    const source = lexeme.dereference();
    const copyMemo = new Map<FeatureStructure, FeatureStructure>();

    for (const attr of ["SYN", "SEM", "ARG-ST"]) {
        const value = source.get(attr);
        if (!value) {
            throw new Error(`Cannot apply lexical rule: lexeme is missing ${attr}.`);
        }
        word.add(attr, value.deepCopy(copyMemo, types), types);
    }

    return word;
}

function setNounHeadAgr(
    word: FeatureStructure,
    agrType: "3sing" | "plural",
    num: "sg" | "pl",
    types: TypeSystem
): void {
    const head = word.getIn(["SYN", "HEAD"]);
    if (!head) {
        throw new Error("Cannot apply noun lexical rule: word is missing SYN.HEAD.");
    }

    setHeadAgr(head, { agr: agrType, num }, types, "noun lexical rule AGR");
}

export function applySingularNounLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    const type = lexeme.getType();
    if (!types.isSubtype(type, "cn-lxm")) {
        throw new Error(`Singular Noun Lexical Rule requires cn-lxm, got ${type}.`);
    }

    const word = buildWordFromLexeme(lexeme, types);
    setNounHeadAgr(word, "3sing", "sg", types);
    return word;
}

export function applyPluralNounLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    const type = lexeme.getType();
    if (!types.isSubtype(type, "cntn-lxm")) {
        throw new Error(`Plural Noun Lexical Rule requires cntn-lxm, got ${type}.`);
    }

    const word = buildWordFromLexeme(lexeme, types);
    setNounHeadAgr(word, "plural", "pl", types);
    return word;
}
