import { FeatureStructureInput } from "../../../features/features.js";

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
    | "ptv-lxm";

export type LexemeConstraintStage = {
    parent?: LexemeType;
    constraints: FeatureStructureInput;
    defaults?: FeatureStructureInput;
};

export const lexemeConstraintStages: Record<LexemeType, LexemeConstraintStage> = {
    "lexeme": {
        constraints: {
            "type": "lexeme",
        },
        defaults: {
            "type": "lexeme",
            "SYN": {
                "type": "syn-cat",
                "VAL": {
                    "type": "val-cat",
                    "MOD": "exp-list-empty",
                },
            },
        },
    },
    "infl-lxm": {
        parent: "lexeme",
        constraints: {
            "type": "infl-lxm",
            "SYN": {
                "type": "syn-cat",
                "HEAD": {
                    "type": "agr-pos",
                    "AGR": {
                        "type": "agr-cat",
                        "_id": "agr",
                    },
                },
                "VAL": {
                    "type": "val-cat",
                    "SPR": {
                        "type": "exp-list-cons",
                        "FIRST": {
                            "type": "expression",
                            "SYN": {
                                "type": "syn-cat",
                                "HEAD": {
                                    "type": "agr-pos",
                                    "AGR": "#agr",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "cn-lxm": {
        parent: "infl-lxm",
        constraints: {
            "type": "cn-lxm",
            "SYN": {
                "type": "syn-cat",
                "HEAD": {
                    "type": "noun",
                    "AGR": {
                        "type": "agr-cat",
                        "PER": "3rd",
                    },
                },
                "VAL": {
                    "type": "val-cat",
                    "SPR": {
                        "type": "exp-list-cons",
                        "FIRST": {
                            "type": "expression",
                            "_id": "spr",
                            "SEM": {
                                "type": "sem-cat",
                                "MODE": "none",
                                "INDEX": {
                                    "type": "index",
                                    "_id": "i",
                                },
                            },
                        },
                        "REST": "exp-list-empty",
                    },
                    "COMPS": "exp-list-empty",
                },
            },
            "SEM": {
                "type": "sem-cat",
                "MODE": "ref",
                "INDEX": "#i",
            },
            "ARG-ST": {
                "type": "exp-list-cons",
                "FIRST": "#spr",
                "REST": "exp-list-empty",
            },
        },
    },
    "cntn-lxm": {
        parent: "cn-lxm",
        constraints: {
            "type": "cntn-lxm",
            "SYN": {
                "type": "syn-cat",
                "VAL": {
                    "type": "val-cat",
                    "SPR": {
                        "type": "exp-list-cons",
                        "FIRST": {
                            "type": "expression",
                            "SYN": {
                                "type": "syn-cat",
                                "HEAD": {
                                    "type": "det",
                                    "COUNT": "+",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "massn-lxm": {
        parent: "cn-lxm",
        constraints: {
            "type": "massn-lxm",
            "SYN": {
                "type": "syn-cat",
                "VAL": {
                    "type": "val-cat",
                    "SPR": {
                        "type": "exp-list-cons",
                        "FIRST": {
                            "type": "expression",
                            "SYN": {
                                "type": "syn-cat",
                                "HEAD": {
                                    "type": "det",
                                    "COUNT": "-",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "verb-lxm": {
        parent: "infl-lxm",
        constraints: {
            "type": "verb-lxm",
            "SYN": {
                "type": "syn-cat",
                "HEAD": {
                    "type": "verb",
                    "AUX": "-",
                },
                "VAL": {
                    "type": "val-cat",
                    "SPR": {
                        "type": "exp-list-cons",
                        "FIRST": {
                            "type": "expression",
                            "_id": "subj",
                            "SYN": {
                                "type": "syn-cat",
                                "HEAD": {
                                    "type": "noun",
                                },
                            },
                        },
                    },
                },
            },
            "SEM": {
                "type": "sem-cat",
                "MODE": "prop",
                "INDEX": {
                    "type": "index",
                    "_id": "sit",
                },
                "RESTR": {
                    "type": "pred-list-cons",
                    "FIRST": {
                        "type": "predication",
                        "SIT": "#sit",
                    },
                },
            },
            "ARG-ST": {
                "type": "exp-list-cons",
                "FIRST": "#subj",
            },
        },
    },
    "siv-lxm": {
        parent: "verb-lxm",
        constraints: {
            "type": "siv-lxm",
            "ARG-ST": {
                "type": "exp-list-cons",
                "FIRST": {
                    "type": "expression",
                    "SEM": {
                        "type": "sem-cat",
                        "INDEX": {
                            "type": "index",
                            "_id": "arg1",
                        },
                    },
                },
                "REST": "exp-list-empty",
            },
            "SEM": {
                "type": "sem-cat",
                "RESTR": {
                    "type": "pred-list-cons",
                    "FIRST": {
                        "type": "predication",
                        "ARG1": "#arg1",
                    },
                    "REST": "pred-list-empty",
                },
            },
        },
    },
    "piv-lxm": {
        parent: "verb-lxm",
        constraints: {
            "type": "piv-lxm",
            "ARG-ST": {
                "type": "exp-list-cons",
                "FIRST": {
                    "type": "expression",
                    "SEM": {
                        "type": "sem-cat",
                        "INDEX": {
                            "type": "index",
                            "_id": "arg1",
                        },
                    },
                },
                "REST": {
                    "type": "exp-list-cons",
                    "FIRST": {
                        "type": "expression",
                        "SYN": {
                            "type": "syn-cat",
                            "HEAD": "prep",
                        },
                        "SEM": {
                            "type": "sem-cat",
                            "INDEX": {
                                "type": "index",
                                "_id": "arg2",
                            },
                        },
                    },
                    "REST": "exp-list-empty",
                },
            },
            "SEM": {
                "type": "sem-cat",
                "RESTR": {
                    "type": "pred-list-cons",
                    "FIRST": {
                        "type": "predication",
                        "ARG1": "#arg1",
                        "ARG2": "#arg2",
                    },
                    "REST": "pred-list-empty",
                },
            },
        },
    },
    "tv-lxm": {
        parent: "verb-lxm",
        constraints: {
            "type": "tv-lxm",
        },
    },
    "stv-lxm": {
        parent: "tv-lxm",
        constraints: {
            "type": "stv-lxm",
            "ARG-ST": {
                "type": "exp-list-cons",
                "FIRST": {
                    "type": "expression",
                    "SEM": {
                        "type": "sem-cat",
                        "INDEX": {
                            "type": "index",
                            "_id": "arg1",
                        },
                    },
                },
                "REST": {
                    "type": "exp-list-cons",
                    "FIRST": {
                        "type": "expression",
                        "SYN": {
                            "type": "syn-cat",
                            "HEAD": "noun",
                        },
                        "SEM": {
                            "type": "sem-cat",
                            "INDEX": {
                                "type": "index",
                                "_id": "arg2",
                            },
                        },
                    },
                    "REST": "exp-list-empty",
                },
            },
            "SEM": {
                "type": "sem-cat",
                "RESTR": {
                    "type": "pred-list-cons",
                    "FIRST": {
                        "type": "predication",
                        "ARG1": "#arg1",
                        "ARG2": "#arg2",
                    },
                    "REST": "pred-list-empty",
                },
            },
        },
    },
    "dtv-lxm": {
        parent: "tv-lxm",
        constraints: {
            "type": "dtv-lxm",
            "ARG-ST": {
                "type": "exp-list-cons",
                "FIRST": {
                    "type": "expression",
                    "SEM": {
                        "type": "sem-cat",
                        "INDEX": {
                            "type": "index",
                            "_id": "arg1",
                        },
                    },
                },
                "REST": {
                    "type": "exp-list-cons",
                    "FIRST": {
                        "type": "expression",
                        "SYN": {
                            "type": "syn-cat",
                            "HEAD": "noun",
                        },
                        "SEM": {
                            "type": "sem-cat",
                            "INDEX": {
                                "type": "index",
                                "_id": "arg2",
                            },
                        },
                    },
                    "REST": {
                        "type": "exp-list-cons",
                        "FIRST": {
                            "type": "expression",
                            "SYN": {
                                "type": "syn-cat",
                                "HEAD": "noun",
                            },
                            "SEM": {
                                "type": "sem-cat",
                                "INDEX": {
                                    "type": "index",
                                    "_id": "arg3",
                                },
                            },
                        },
                        "REST": "exp-list-empty",
                    },
                },
            },
            "SEM": {
                "type": "sem-cat",
                "RESTR": {
                    "type": "pred-list-cons",
                    "FIRST": {
                        "type": "predication",
                        "ARG1": "#arg1",
                        "ARG2": "#arg2",
                        "ARG3": "#arg3",
                    },
                    "REST": "pred-list-empty",
                },
            },
        },
    },
    "ptv-lxm": {
        parent: "tv-lxm",
        constraints: {
            "type": "ptv-lxm",
            "ARG-ST": {
                "type": "exp-list-cons",
                "FIRST": {
                    "type": "expression",
                    "SEM": {
                        "type": "sem-cat",
                        "INDEX": {
                            "type": "index",
                            "_id": "arg1",
                        },
                    },
                },
                "REST": {
                    "type": "exp-list-cons",
                    "FIRST": {
                        "type": "expression",
                        "SYN": {
                            "type": "syn-cat",
                            "HEAD": "noun",
                        },
                        "SEM": {
                            "type": "sem-cat",
                            "INDEX": {
                                "type": "index",
                                "_id": "arg3",
                            },
                        },
                    },
                    "REST": {
                        "type": "exp-list-cons",
                        "FIRST": {
                            "type": "expression",
                            "SYN": {
                                "type": "syn-cat",
                                "HEAD": "prep",
                            },
                            "SEM": {
                                "type": "sem-cat",
                                "INDEX": {
                                    "type": "index",
                                    "_id": "arg2",
                                },
                            },
                        },
                        "REST": "exp-list-empty",
                    },
                },
            },
            "SEM": {
                "type": "sem-cat",
                "RESTR": {
                    "type": "pred-list-cons",
                    "FIRST": {
                        "type": "predication",
                        "ARG1": "#arg1",
                        "ARG2": "#arg2",
                        "ARG3": "#arg3",
                    },
                    "REST": "pred-list-empty",
                },
            },
        },
    },
};

export function getLexemeConstraintChain(type: LexemeType): LexemeConstraintStage[] {
    const chain: LexemeConstraintStage[] = [];
    let current: LexemeType | undefined = type;

    while (current) {
        const stage: LexemeConstraintStage = lexemeConstraintStages[current];
        chain.unshift(stage);
        current = stage.parent;
    }

    return chain;
}
