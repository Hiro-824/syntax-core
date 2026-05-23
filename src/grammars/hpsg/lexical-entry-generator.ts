import { FeatureStructure, FeatureStructureInput } from "../../features/features.js";
import { TypeSystem } from "../../features/types.js";
import { LexemeInput } from "./lexeme.js";

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

function ensureRelnSubtype(relnName: string, types: TypeSystem): void {
    if (relnName === "reln") return;

    if (types.hasType(relnName)) {
        if (!types.isSubtype(relnName, "reln")) {
            throw new Error(`Type "${relnName}" already exists but is not a subtype of "reln".`);
        }
        return;
    }

    types.addType(relnName, "reln");
}

function buildIndividualLexemeConstraint(input: LexemeInput): FeatureStructureInput {
    return {
        "type": input.type,
        "SEM": {
            "type": "sem-cat",
            "INDEX": {
                "type": "index",
                "_id": "i",
            },
            "RESTR": {
                "type": "pred-list-cons",
                "FIRST": {
                    "type": "predication",
                    "RELN": input.reln,
                    "ARG1": "#i",
                },
                "REST": "pred-list-empty",
            },
        },
    };
}

function fromInput(input: FeatureStructureInput, types: TypeSystem): FeatureStructure {
    return FeatureStructure.fromJSON(input, types);
}

function unifyAll(inputs: FeatureStructureInput[], types: TypeSystem): FeatureStructure {
    if (inputs.length === 0) {
        throw new Error("Cannot build a lexeme without constraints.");
    }

    let result = fromInput(inputs[0]!, types);

    for (const input of inputs.slice(1)) {
        const next = fromInput(input, types);
        FeatureStructure.unify(result, next, types);
        result = result.dereference();
    }

    return result;
}

function applyDefaults(target: FeatureStructure, defaults: FeatureStructure, types: TypeSystem): void {
    const targetNode = target.dereference();
    const defaultNode = defaults.dereference();

    if (types.unifyTypes(targetNode.getType(), defaultNode.getType()) === null) {
        return;
    }

    for (const attr of defaultNode.getAttributes()) {
        const targetChild = targetNode.get(attr);
        const defaultChild = defaultNode.get(attr)!;

        if (targetChild) {
            applyDefaults(targetChild, defaultChild, types);
        } else {
            targetNode.add(attr, defaultChild.deepCopy(new Map(), types), types);
        }
    }
}

export function buildCompleteLexeme(input: LexemeInput, types: TypeSystem): FeatureStructure {
    ensureRelnSubtype(input.reln, types);

    const chain = getLexemeConstraintChain(input.type);
    const completeLexeme = unifyAll(
        [
            ...chain.map(stage => stage.constraints),
            buildIndividualLexemeConstraint(input),
        ],
        types
    );

    for (const stage of chain) {
        if (!stage.defaults) continue;
        applyDefaults(completeLexeme, fromInput(stage.defaults, types), types);
    }

    return completeLexeme;
}
