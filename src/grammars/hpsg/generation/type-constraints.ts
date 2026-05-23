import { FeatureStructureInput } from "../../../features/features.js";

export type LexemeType =
    | "lexeme"
    | "infl-lxm"
    | "cn-lxm"
    | "cntn-lxm"
    | "massn-lxm";

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
