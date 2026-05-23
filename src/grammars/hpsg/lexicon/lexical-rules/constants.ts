import { FeatureStructure } from "../../../../features/features.js";
import { TypeSystem } from "../../../../features/types.js";

export function applyConstantLexemeLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    const type = lexeme.getType();
    if (!types.isSubtype(type, "const-lxm")) {
        throw new Error(`Constant Lexeme Lexical Rule requires const-lxm, got ${type}.`);
    }

    const word = new FeatureStructure("word");
    const source = lexeme.dereference();
    const copyMemo = new Map<FeatureStructure, FeatureStructure>();

    for (const attr of ["SYN", "SEM", "ARG-ST"]) {
        const value = source.get(attr);
        if (!value) {
            throw new Error(`Cannot apply Constant Lexeme Lexical Rule: lexeme is missing ${attr}.`);
        }
        word.add(attr, value.deepCopy(copyMemo, types), types);
    }

    return word;
}
