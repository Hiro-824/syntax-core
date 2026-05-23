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

export type LexemeInput =
    | CountNounLexemeInput
    | MassNounLexemeInput
    | SimpleIntransitiveVerbLexemeInput
    | PrepositionalIntransitiveVerbLexemeInput
    | SimpleTransitiveVerbLexemeInput
    | DitransitiveVerbLexemeInput
    | PrepositionalTransitiveVerbLexemeInput;
