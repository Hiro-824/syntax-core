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

function assertTransitiveVerbLexeme(lexeme: FeatureStructure, types: TypeSystem, ruleName: string): void {
    const type = lexeme.getType();
    if (!types.isSubtype(type, "tv-lxm")) {
        throw new Error(`${ruleName} requires tv-lxm, got ${type}.`);
    }
}

function setHeadForm(
    word: FeatureStructure,
    form: "base" | "fin" | "prp" | "psp" | "pass",
    types: TypeSystem
): void {
    const head = word.getIn(["SYN", "HEAD"]);
    if (!head) {
        throw new Error("Cannot apply verb lexical rule: word is missing SYN.HEAD.");
    }
    head.add("FORM", new FeatureStructure(form), types);
}

function setHeadPred(word: FeatureStructure, pred: "+" | "-", types: TypeSystem): void {
    const head = word.getIn(["SYN", "HEAD"]);
    if (!head) {
        throw new Error("Cannot apply verb lexical rule: word is missing SYN.HEAD.");
    }
    head.add("PRED", new FeatureStructure(pred), types);
}

function setHeadAgr(
    word: FeatureStructure,
    agrType: "agr-cat" | "1sing" | "3sing" | "non-1sing" | "non-3sing" | "plural",
    types: TypeSystem
): void {
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
    setHeadPred(word, "-", types);
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
    setHeadPred(word, "-", types);
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
    setHeadPred(word, "-", types);
    setSubjectCase(word, "nom", types);
    return word;
}

export function applyBaseFormLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    const word = applyVerbRuleBase(lexeme, types, "Base Form Lexical Rule");
    setHeadForm(word, "base", types);
    setHeadPred(word, "-", types);
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
    setHeadPred(participle, "+", types);
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
    setHeadPred(participle, "-", types);
    return participle;
}

export function applyPassiveLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    const ruleName = "Passive Lexical Rule";
    assertTransitiveVerbLexeme(lexeme, types, ruleName);

    const sourceSyn = lexeme.get("SYN");
    const sourceSem = lexeme.get("SEM");
    const sourceArgSt = lexeme.get("ARG-ST");
    const sourceHead = sourceSyn?.get("HEAD");
    const sourceVal = sourceSyn?.get("VAL");
    const reducedArgSt = sourceArgSt?.get("REST");
    if (!sourceSyn || !sourceSem || !sourceArgSt || !sourceHead || !sourceVal || !reducedArgSt) {
        throw new Error(`${ruleName} requires SYN, SEM, and a non-empty ARG-ST.`);
    }

    const copyMemo = new Map<FeatureStructure, FeatureStructure>();
    const participle = new FeatureStructure("part-lxm");
    const syn = new FeatureStructure("syn-cat");
    const val = new FeatureStructure("val-cat");

    syn.add("HEAD", sourceHead.deepCopy(copyMemo, types), types);
    for (const attr of ["GAP", "STOP-GAP"]) {
        const value = sourceSyn.get(attr);
        if (value) syn.add(attr, value.deepCopy(copyMemo, types), types);
    }
    const sourceMod = sourceVal.get("MOD");
    if (sourceMod) val.add("MOD", sourceMod.deepCopy(copyMemo, types), types);
    syn.add("VAL", val, types);

    participle.add("SYN", syn, types);
    participle.add("SEM", sourceSem.deepCopy(copyMemo, types), types);
    participle.add("ARG-ST", reducedArgSt.deepCopy(copyMemo, types), types);

    setValenceFromArgSt(participle, types, ruleName);
    setHeadForm(participle, "pass", types);
    setHeadPred(participle, "+", types);
    return participle;
}

function assertBeLexeme(lexeme: FeatureStructure): void {
    if (lexeme.getType() !== "be-lxm") {
        throw new Error(`Be Lexical Rule requires be-lxm, got ${lexeme.getType()}.`);
    }
}

function applyBeWordRule(
    lexeme: FeatureStructure,
    form: "base" | "fin",
    agrType: "agr-cat" | "1sing" | "3sing" | "non-1sing" | "non-3sing" | "plural",
    finite: boolean,
    types: TypeSystem,
    ruleName: string
): FeatureStructure {
    assertBeLexeme(lexeme);
    const word = buildWordFromLexeme(lexeme, types);
    setValenceFromArgSt(word, types, ruleName);
    setHeadForm(word, form, types);
    setHeadPred(word, "-", types);
    setHeadAgr(word, agrType, types);
    if (finite) setSubjectCase(word, "nom", types);
    return word;
}

export function applyBeBaseLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    return applyBeWordRule(lexeme, "base", "agr-cat", false, types, "Be Base Lexical Rule");
}

export function applyBeFirstSingularLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    return applyBeWordRule(lexeme, "fin", "1sing", true, types, "Be First-Singular Lexical Rule");
}

export function applyBeThirdSingularLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    return applyBeWordRule(lexeme, "fin", "3sing", true, types, "Be Third-Singular Lexical Rule");
}

export function applyBeNonThirdSingularLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    return applyBeWordRule(lexeme, "fin", "non-1sing", true, types, "Be Non-First-Singular Lexical Rule");
}

export function applyBePastNonFirstSingularLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    return applyBeWordRule(lexeme, "fin", "non-1sing", true, types, "Be Past Non-First-Singular Lexical Rule");
}

export function applyBePresentParticipleLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    assertBeLexeme(lexeme);
    const participle = buildParticipleLexemeFromVerb(lexeme, types);
    setValenceFromArgSt(participle, types, "Be Present Participle Lexical Rule");
    setHeadForm(participle, "prp", types);
    setHeadPred(participle, "+", types);
    return participle;
}

export function applyBePastParticipleLexicalRule(
    lexeme: FeatureStructure,
    types: TypeSystem
): FeatureStructure {
    assertBeLexeme(lexeme);
    const participle = buildParticipleLexemeFromVerb(lexeme, types);
    setValenceFromArgSt(participle, types, "Be Past Participle Lexical Rule");
    setHeadForm(participle, "psp", types);
    setHeadPred(participle, "-", types);
    return participle;
}
