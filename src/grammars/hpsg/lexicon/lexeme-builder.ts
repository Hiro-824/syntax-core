import { FeatureStructure, FeatureStructureInput } from "../../../features/features.js";
import { TypeSystem } from "../../../features/types.js";
import { LexemeInput } from "./lexeme-input.js";
import { getLexemeConstraintChain } from "./lexeme-constraints.js";
import { ensureLexemeInputRelns } from "../type-system/relns.js";
import { buildAgrInput } from "./agr.js";

function buildIndividualLexemeConstraint(input: LexemeInput): FeatureStructureInput {
    if (input.type === "pron-lxm") {
        const definedIndexes = new Set<string>();
        const buildIndexValue = (name: string): FeatureStructureInput => {
            if (definedIndexes.has(name)) return `#${name}`;
            definedIndexes.add(name);
            return {
                "type": "index",
                "_id": name,
            };
        };

        const head: FeatureStructureInput = {
            "type": "noun",
        };
        if (input.case) {
            head["CASE"] = input.case;
        }
        if (input.agr || input.per || input.num || input.gend) {
            head["AGR"] = buildAgrInput(input, `pronoun ${input.form} AGR`);
        }

        const sem: FeatureStructureInput = {
            "type": "sem-cat",
            "MODE": input.mode ?? "ref",
        };
        if (input.index) {
            definedIndexes.add(input.index);
            sem["INDEX"] = {
                "type": "index",
                "_id": input.index,
            };
        }
        if (input.restr) {
            sem["RESTR"] = buildPredList(
                input.restr.map(pred => {
                    const predication: FeatureStructureInput = {
                        "type": "predication",
                        "RELN": pred.reln,
                    };
                    if (pred.arg1) predication["ARG1"] = buildIndexValue(pred.arg1);
                    if (pred.arg2) predication["ARG2"] = buildIndexValue(pred.arg2);
                    if (pred.arg3) predication["ARG3"] = buildIndexValue(pred.arg3);
                    return predication;
                })
            );
        }

        return {
            "type": input.type,
            "SYN": {
                "type": "syn-cat",
                "HEAD": head,
            },
            "SEM": sem,
        };
    }

    if (input.type === "det-lxm") {
        const head: FeatureStructureInput = {
            "type": "det",
        };
        if (input.count) {
            head["COUNT"] = input.count;
        }

        return {
            "type": input.type,
            "SYN": {
                "type": "syn-cat",
                "HEAD": head,
            },
        };
    }

    if (input.type === "piv-lxm") {
        return {
            "type": input.type,
            "ARG-ST": {
                "type": "exp-list-cons",
                "REST": {
                    "type": "exp-list-cons",
                    "FIRST": {
                        "type": "expression",
                        "SYN": {
                            "type": "syn-cat",
                            "HEAD": {
                                "type": "prep",
                                "FORM": input.prepositionForm,
                            },
                        },
                    },
                },
            },
            "SEM": buildRelnOnlySem(input.reln),
        };
    }

    if (input.type === "ptv-lxm") {
        return {
            "type": input.type,
            "ARG-ST": {
                "type": "exp-list-cons",
                "REST": {
                    "type": "exp-list-cons",
                    "REST": {
                        "type": "exp-list-cons",
                        "FIRST": {
                            "type": "expression",
                            "SYN": {
                                "type": "syn-cat",
                                "HEAD": {
                                    "type": "prep",
                                    "FORM": input.prepositionForm,
                                },
                            },
                        },
                    },
                },
            },
            "SEM": buildRelnOnlySem(input.reln),
        };
    }

    if (input.type === "predp-lxm") {
        const val: FeatureStructureInput = {
            "type": "val-cat",
            "MOD": {
                "type": "exp-list-cons",
                "FIRST": {
                    "type": "expression",
                    "SYN": {
                        "type": "syn-cat",
                        "HEAD": input.mod === "nom" ? "noun" : "verb",
                    },
                },
                "REST": "exp-list-empty",
            },
        };

        return {
            "type": input.type,
            "SYN": {
                "type": "syn-cat",
                "VAL": val,
            },
            "SEM": buildRelnOnlySem(input.reln),
        };
    }

    if (!input.reln) {
        return {
            "type": input.type,
        };
    }

    if (input.type === "argmkp-lxm") {
        return {
            "type": input.type,
        };
    }

    if (
        input.type === "siv-lxm" ||
        input.type === "stv-lxm" ||
        input.type === "dtv-lxm" ||
        input.type === "adj-lxm"
    ) {
        return {
            "type": input.type,
            "SEM": buildRelnOnlySem(input.reln),
        };
    }

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

function buildRelnOnlySem(reln: string): FeatureStructureInput {
    return {
        "type": "sem-cat",
        "RESTR": {
            "type": "pred-list-cons",
            "FIRST": {
                "type": "predication",
                "RELN": reln,
            },
            "REST": "pred-list-empty",
        },
    };
}

function buildPredList(predications: FeatureStructureInput[]): FeatureStructureInput {
    if (predications.length === 0) return "pred-list-empty";

    const [first, ...rest] = predications;
    return {
        "type": "pred-list-cons",
        "FIRST": first!,
        "REST": buildPredList(rest),
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
    ensureLexemeInputRelns(types, input);

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
