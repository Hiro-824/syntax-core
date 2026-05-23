import { FeatureStructure, FeatureStructureInput } from "../../../features/features.js";
import { TypeSystem } from "../../../features/types.js";
import { LexemeInput } from "../lexemes/types.js";
import { getLexemeConstraintChain } from "./type-constraints.js";

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
    if (
        input.type === "siv-lxm" ||
        input.type === "piv-lxm" ||
        input.type === "stv-lxm" ||
        input.type === "dtv-lxm" ||
        input.type === "ptv-lxm"
    ) {
        return {
            "type": input.type,
            "SEM": {
                "type": "sem-cat",
                "RESTR": {
                    "type": "pred-list-cons",
                    "FIRST": {
                        "type": "predication",
                        "RELN": input.reln,
                    },
                    "REST": "pred-list-empty",
                },
            },
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
