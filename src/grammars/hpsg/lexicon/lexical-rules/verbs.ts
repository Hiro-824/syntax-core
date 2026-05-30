import { FeatureStructure } from "../../../../features/features.js";
import { TypeSystem } from "../../../../features/types.js";
import { setHeadAgr as setHeadAgrFeature } from "../agr.js";
import { setValenceFromArgSt } from "../valence.js";

function buildWordFromLexeme(lexeme: FeatureStructure, types: TypeSystem): FeatureStructure {
    return buildSynsemFromLexeme(lexeme, "word", types);
}

function buildParticipleLexemeFromVerb(lexeme: FeatureStructure, types: TypeSystem): FeatureStructure {
    return buildSynsemFromLexeme(lexeme, "part-lxm", types);
}

function buildSynsemFromLexeme(
    lexeme: FeatureStructure,
    resultType: "word" | "part-lxm",
    types: TypeSystem
): FeatureStructure {
    const result = new FeatureStructure(resultType);
    const source = lexeme.dereference();
    const copyMemo = new Map<FeatureStructure, FeatureStructure>();

    for (const attr of ["SYN", "SEM", "ARG-ST"]) {
        const value = source.get(attr);
        if (!value) {
            throw new Error(`Cannot apply lexical rule: lexeme is missing ${attr}.`);
        }
        result.add(attr, value.deepCopy(copyMemo, types), types);
    }

    return result;
}

function assertVerbLexeme(lexeme: FeatureStructure, types: TypeSystem, ruleName: string): void {
    const type = lexeme.getType();
    if (!types.isSubtype(type, "verb-lxm")) {
        throw new Error(`${ruleName} requires verb-lxm, got ${type}.`);
    }
}

function setHeadForm(word: FeatureStructure, form: "base" | "fin" | "prp" | "psp", types: TypeSystem): void {
    const head = word.getIn(["SYN", "HEAD"]);
    if (!head) {
        throw new Error("Cannot apply verb lexical rule: word is missing SYN.HEAD.");
    }
    head.add("FORM", new FeatureStructure(form), types);
}

function setHeadAgr(word: FeatureStructure, agrType: "3sing" | "non-3sing", types: TypeSystem): void {
    const head = word.getIn(["SYN", "HEAD"]);
    if (!head) {
        throw new Error("Cannot apply verb lexical rule: word is missing SYN.HEAD.");
    }
    setHeadAgrFeature(head, { agr: agrType }, types, "verb lexical rule AGR");
}

function setSubjectCase(word: FeatureStructure, caseType: "nom", types: TypeSystem): void {
    const subjectHead = word.getIn(["ARG-ST", "FIRST", "SYN", "HEAD"]);
    if (!subjectHead) {
        throw new Error("Cannot apply verb lexical rule: word is missing ARG-ST.FIRST.SYN.HEAD.");
    }
    subjectHead.add("CASE", new FeatureStructure(caseType), types);
}

function applyVerbRuleBase(lexeme: FeatureStructure, types: TypeSystem, ruleName: string): FeatureStructure {
    assertVerbLexeme(lexeme, types, ruleName);
    const word = buildWordFromLexeme(lexeme, types);
    setValenceFromArgSt(word, types, ruleName);
    return word;
}

export function applyThirdSingularVerbLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    const word = applyVerbRuleBase(lexeme, types, "3rd-Singular Verb Lexical Rule");
    setHeadForm(word, "fin", types);
    setHeadAgr(word, "3sing", types);
    setSubjectCase(word, "nom", types);
    return word;
}

export function applyNonThirdSingularVerbLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    const word = applyVerbRuleBase(lexeme, types, "Non-3rd-Singular Verb Lexical Rule");
    setHeadForm(word, "fin", types);
    setHeadAgr(word, "non-3sing", types);
    setSubjectCase(word, "nom", types);
    return word;
}

export function applyPastTenseVerbLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    const word = applyVerbRuleBase(lexeme, types, "Past-Tense Verb Lexical Rule");
    setHeadForm(word, "fin", types);
    setSubjectCase(word, "nom", types);
    return word;
}

export function applyBaseFormLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    const word = applyVerbRuleBase(lexeme, types, "Base Form Lexical Rule");
    setHeadForm(word, "base", types);
    return word;
}

export function applyPresentParticipleLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    assertVerbLexeme(lexeme, types, "Present Participle Lexical Rule");
    const participle = buildParticipleLexemeFromVerb(lexeme, types);
    setValenceFromArgSt(participle, types, "Present Participle Lexical Rule");
    setHeadForm(participle, "prp", types);
    return participle;
}

export function applyPastParticipleLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    assertVerbLexeme(lexeme, types, "Past Participle Lexical Rule");
    const participle = buildParticipleLexemeFromVerb(lexeme, types);
    setValenceFromArgSt(participle, types, "Past Participle Lexical Rule");
    setHeadForm(participle, "psp", types);
    return participle;
}
