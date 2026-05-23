export type CountNounLexemeInput = {
    type: "cntn-lxm";
    singular: string;
    plural: string;
    reln: string;
};

export type MassNounLexemeInput = {
    type: "massn-lxm";
    form: string;
    reln: string;
};

type VerbLexemeInputBase = {
    base: string;
    thirdSingular: string;
    presentParticiple: string;
    pastParticiple: string;
    reln: string;
};

export type SimpleIntransitiveVerbLexemeInput = VerbLexemeInputBase & {
    type: "siv-lxm";
};

export type PrepositionalIntransitiveVerbLexemeInput = VerbLexemeInputBase & {
    type: "piv-lxm";
};

export type SimpleTransitiveVerbLexemeInput = VerbLexemeInputBase & {
    type: "stv-lxm";
};

export type DitransitiveVerbLexemeInput = VerbLexemeInputBase & {
    type: "dtv-lxm";
};

export type PrepositionalTransitiveVerbLexemeInput = VerbLexemeInputBase & {
    type: "ptv-lxm";
};

type ConstantLexemeInputBase = {
    form: string;
    reln?: string;
};

export type ProperNounLexemeInput = ConstantLexemeInputBase & {
    type: "pn-lxm";
};

export type PronounLexemeInput = ConstantLexemeInputBase & {
    type: "pron-lxm";
};

export type AdjectiveLexemeInput = ConstantLexemeInputBase & {
    type: "adj-lxm";
    reln: string;
};

export type AdverbLexemeInput = ConstantLexemeInputBase & {
    type: "adv-lxm";
};

export type DeterminerLexemeInput = ConstantLexemeInputBase & {
    type: "det-lxm";
};

export type ArgumentMarkingPrepositionLexemeInput = ConstantLexemeInputBase & {
    type: "argmkp-lxm";
};

export type PredicativePrepositionLexemeInput = ConstantLexemeInputBase & {
    type: "predp-lxm";
    reln: string;
};

export type ParticleLexemeInput = ConstantLexemeInputBase & {
    type: "part-lxm";
};

export type LexemeInput =
    | CountNounLexemeInput
    | MassNounLexemeInput
    | SimpleIntransitiveVerbLexemeInput
    | PrepositionalIntransitiveVerbLexemeInput
    | SimpleTransitiveVerbLexemeInput
    | DitransitiveVerbLexemeInput
    | PrepositionalTransitiveVerbLexemeInput
    | ProperNounLexemeInput
    | PronounLexemeInput
    | AdjectiveLexemeInput
    | AdverbLexemeInput
    | DeterminerLexemeInput
    | ArgumentMarkingPrepositionLexemeInput
    | PredicativePrepositionLexemeInput
    | ParticleLexemeInput;
