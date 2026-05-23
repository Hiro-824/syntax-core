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

export const lexemeData: LexemeInput[] = [
    {
        type: "cntn-lxm",
        singular: "girl",
        plural: "girls",
        reln: "girl",
    },
    {
        type: "cntn-lxm",
        singular: "telescope",
        plural: "telescopes",
        reln: "telescope",
    },
    {
        type: "massn-lxm",
        form: "water",
        reln: "water",
    },
];
