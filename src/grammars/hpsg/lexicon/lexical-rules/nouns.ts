import { FeatureStructure } from "../../../../features/features.js";
import { TypeSystem } from "../../../../features/types.js";

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

function addHeadAgrNum(word: FeatureStructure, num: "sg" | "pl", types: TypeSystem): void {
    const agr = word.getIn(["SYN", "HEAD", "AGR"]);
    if (!agr) {
        throw new Error("Cannot apply noun lexical rule: word is missing SYN.HEAD.AGR.");
    }

    agr.add("NUM", new FeatureStructure(num), types);
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
    addHeadAgrNum(word, "sg", types);
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
    addHeadAgrNum(word, "pl", types);
    return word;
}
