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

export type LexemeInput =
    | CountNounLexemeInput
    | MassNounLexemeInput;
