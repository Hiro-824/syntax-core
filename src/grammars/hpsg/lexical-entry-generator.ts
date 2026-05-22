import { FeatureStructureAVM, FeatureStructureInput } from "../../features/features.js";

export type LexemeType =
    | "lexeme"
    | "infl-lxm"
    | "cn-lxm"
    | "cntn-lxm"
    | "massn-lxm"
    | "verb-lxm"
    | "siv-lxm"
    | "piv-lxm"
    | "tv-lxm"
    | "stv-lxm"
    | "dtv-lxm"
    | "ptv-lxm"
    | "const-lxm"
    | "pn-lxm"
    | "pron-lxm"
    | "adj-lxm"
    | "adv-lxm"
    | "conj-lxm"
    | "det-lxm"
    | "predp-lxm"
    | "argmkp-lxm"
    | "part-lxm";

export type LexicalRuleName =
    | "singular-noun"
    | "plural-noun"
    | "third-singular-verb"
    | "non-third-singular-verb"
    | "past-tense-verb"
    | "base-form-verb"
    | "constant-lexeme"
    | "present-participle"
    | "past-participle";

type VerbForm = "base" | "fin" | "prp" | "psp" | "pass";

export type DerivedLexicalEntry = {
    word: string;
    lexemeId: string;
    lexemeType: LexemeType;
    rule: LexicalRuleName;
    entry: FeatureStructureInput;
};

export type LexemeBase = {
    id: string;
    type: LexemeType;
    lemma: string;
};

export type NounComplementSpec = {
    head: FeatureStructureInput;
    indexId: string;
};

export type CommonNounLexemeInput = LexemeBase & {
    type: "cn-lxm" | "cntn-lxm" | "massn-lxm";
    reln: string;
    count: "+" | "-";
    complements?: NounComplementSpec[];
};

export type CountNounLexemeInput = CommonNounLexemeInput & {
    type: "cntn-lxm";
};

export type NounLexicalRuleInput = {
    lexeme: CommonNounLexemeInput;
    word: string;
    agr: FeatureStructureInput;
};

export type VerbArgumentSpec = {
    head: FeatureStructureInput;
    indexId: string;
};

export type VerbLexemeInput = LexemeBase & {
    type: "verb-lxm" | "siv-lxm" | "piv-lxm" | "tv-lxm" | "stv-lxm" | "dtv-lxm" | "ptv-lxm";
    reln: string;
    aux?: "+" | "-";
    subjectIndexId?: string;
    complements?: VerbArgumentSpec[];
};

export type VerbLexicalRuleInput = {
    lexeme: VerbLexemeInput;
    word: string;
};

export type ConstLexemeInput = LexemeBase & {
    type:
        | "const-lxm"
        | "pn-lxm"
        | "pron-lxm"
        | "adj-lxm"
        | "adv-lxm"
        | "conj-lxm"
        | "det-lxm"
        | "predp-lxm"
        | "argmkp-lxm"
        | "part-lxm";
    word: string;
    entry: FeatureStructureInput;
};

export type ParticipleLexemeInput = ConstLexemeInput & {
    type: "part-lxm";
    sourceLexemeId: string;
    sourceRule: "present-participle" | "past-participle";
    participleForm: "prp" | "psp";
};

export type ParticipleLexicalRuleInput = {
    lexeme: VerbLexemeInput;
    word: string;
};

function consList(items: FeatureStructureInput[], emptyType: "exp-list-empty" | "pred-list-empty"): FeatureStructureInput {
    const consType = emptyType === "exp-list-empty" ? "exp-list-cons" : "pred-list-cons";
    return items.reduceRight<FeatureStructureInput>(
        (rest, first) => ({ type: consType, FIRST: first, REST: rest }),
        emptyType,
    );
}

function predication(reln: string, args: string[]): FeatureStructureAVM {
    const pred: FeatureStructureAVM = { type: "predication", RELN: reln };
    args.forEach((arg, index) => {
        pred[`ARG${index + 1}`] = `#${arg}`;
    });
    return pred;
}

function expressionArg(id: string, head: FeatureStructureInput, indexId: string): FeatureStructureAVM {
    return {
        type: "expression",
        _id: id,
        SYN: {
            type: "syn-cat",
            HEAD: head,
        },
        SEM: {
            type: "sem-cat",
            INDEX: { type: "index", _id: indexId },
        },
    };
}

function nounEntry(input: NounLexicalRuleInput, rule: "singular-noun" | "plural-noun"): DerivedLexicalEntry {
    const { lexeme, word, agr } = input;
    const indexId = "i";
    const specifier = expressionArg("arg_spr_0", {
        type: "det",
        AGR: "#agr",
        COUNT: lexeme.count,
    }, "k");
    const complementArgs = (lexeme.complements ?? []).map((complement, index) =>
        expressionArg(`arg_comps_${index}`, complement.head, complement.indexId)
    );

    return {
        word,
        lexemeId: lexeme.id,
        lexemeType: lexeme.type,
        rule,
        entry: {
            type: "word",
            SYN: {
                type: "syn-cat",
                HEAD: {
                    type: "noun",
                    FORM: "nform",
                    AGR: {
                        ...(typeof agr === "string" ? { type: agr } : agr),
                        _id: "agr",
                    },
                },
                VAL: {
                    type: "val-cat",
                    SPR: consList([specifier], "exp-list-empty"),
                    COMPS: consList(complementArgs, "exp-list-empty"),
                    MOD: "exp-list-empty",
                },
            },
            SEM: {
                type: "sem-cat",
                MODE: "ref",
                INDEX: { type: "index", _id: indexId },
                RESTR: consList([
                    predication(lexeme.reln, [indexId, ...((lexeme.complements ?? []).map(c => c.indexId))]),
                ], "pred-list-empty"),
            },
            "ARG-ST": consList([
                "#arg_spr_0",
                ...complementArgs.map((_, index) => `#arg_comps_${index}`),
            ], "exp-list-empty"),
        },
    };
}

export function singularNounLexicalRule(input: NounLexicalRuleInput): DerivedLexicalEntry {
    return nounEntry(input, "singular-noun");
}

export function pluralNounLexicalRule(input: NounLexicalRuleInput & { lexeme: CountNounLexemeInput }): DerivedLexicalEntry {
    return nounEntry(input, "plural-noun");
}

function verbEntry(
    input: VerbLexicalRuleInput,
    rule: "third-singular-verb" | "non-third-singular-verb" | "past-tense-verb" | "base-form-verb",
    form: VerbForm,
    subjectAgr?: FeatureStructureInput,
): DerivedLexicalEntry {
    const { lexeme, word } = input;
    const subjectIndexId = lexeme.subjectIndexId ?? "i";
    const subjectHead: FeatureStructureAVM = {
        type: "noun",
        CASE: "nom",
    };
    if (subjectAgr) {
        subjectHead.AGR = subjectAgr;
    }

    const subject = expressionArg("arg_spr_0", subjectHead, subjectIndexId);
    const complementArgs = (lexeme.complements ?? []).map((complement, index) =>
        expressionArg(`arg_comps_${index}`, complement.head, complement.indexId)
    );

    return {
        word,
        lexemeId: lexeme.id,
        lexemeType: lexeme.type,
        rule,
        entry: {
            type: "word",
            SYN: {
                type: "syn-cat",
                HEAD: {
                    type: "verb",
                    FORM: form,
                    AUX: lexeme.aux ?? "-",
                },
                VAL: {
                    type: "val-cat",
                    SPR: consList([subject], "exp-list-empty"),
                    COMPS: consList(complementArgs, "exp-list-empty"),
                    MOD: "exp-list-empty",
                },
            },
            SEM: {
                type: "sem-cat",
                MODE: "prop",
                INDEX: { type: "index" },
                RESTR: consList([
                    predication(lexeme.reln, [subjectIndexId, ...((lexeme.complements ?? []).map(c => c.indexId))]),
                ], "pred-list-empty"),
            },
            "ARG-ST": consList([
                "#arg_spr_0",
                ...complementArgs.map((_, index) => `#arg_comps_${index}`),
            ], "exp-list-empty"),
        },
    };
}

export function thirdSingularVerbLexicalRule(input: VerbLexicalRuleInput): DerivedLexicalEntry {
    return verbEntry(input, "third-singular-verb", "fin", "3sing");
}

export function nonThirdSingularVerbLexicalRule(input: VerbLexicalRuleInput): DerivedLexicalEntry {
    return verbEntry(input, "non-third-singular-verb", "fin", "non-3sing");
}

export function pastTenseVerbLexicalRule(input: VerbLexicalRuleInput): DerivedLexicalEntry {
    return verbEntry(input, "past-tense-verb", "fin");
}

export function baseFormLexicalRule(input: VerbLexicalRuleInput): DerivedLexicalEntry {
    return verbEntry(input, "base-form-verb", "base");
}

export function constantLexemeLexicalRule(lexeme: ConstLexemeInput): DerivedLexicalEntry {
    return {
        word: lexeme.word,
        lexemeId: lexeme.id,
        lexemeType: lexeme.type,
        rule: "constant-lexeme",
        entry: lexeme.entry,
    };
}

function participleLexeme(
    input: ParticipleLexicalRuleInput,
    rule: "present-participle" | "past-participle",
    form: "prp" | "psp",
): ParticipleLexemeInput {
    const derivedEntry = verbEntry(input, "base-form-verb", form);
    return {
        id: `${input.lexeme.id}-${form}`,
        type: "part-lxm",
        lemma: input.word,
        word: input.word,
        sourceLexemeId: input.lexeme.id,
        sourceRule: rule,
        participleForm: form,
        entry: derivedEntry.entry,
    };
}

export function presentParticipleLexicalRule(input: ParticipleLexicalRuleInput): ParticipleLexemeInput {
    return participleLexeme(input, "present-participle", "prp");
}

export function pastParticipleLexicalRule(input: ParticipleLexicalRuleInput): ParticipleLexemeInput {
    return participleLexeme(input, "past-participle", "psp");
}
