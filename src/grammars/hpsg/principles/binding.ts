import { FeatureStructure } from "../../../features/features.js";
import { TypeSystem } from "../../../features/types.js";

function linearizeList(list: FeatureStructure, types: TypeSystem): FeatureStructure[] {
    const linear: FeatureStructure[] = [];
    if (!types.isSubtype(list.getType(), "exp-list")) {
        throw new Error(`Cannot linearize non exp-list: ${list.getType()}`);
    }

    let node = list.dereference();
    while (node.getType() === "exp-list-cons") {
        const first = node.get("FIRST");
        const rest = node.get("REST");
        if (!first || !rest) {
            throw new Error("Malformed exp-list-cons: missing FIRST and/or REST");
        }
        linear.push(first);
        node = rest.dereference();
    }

    if (node.getType() !== "exp-list-empty") {
        throw new Error(`Malformed exp-list: expected exp-list-empty, got ${node.getType()}`);
    }

    return linear;
}

export function enforceBindingTheory(mother: FeatureStructure, types: TypeSystem): void {
    const argSt = mother.get("ARG-ST");
    if (!argSt) {
        throw new Error("Mother is missing ARG-ST.");
    }

    const args = linearizeList(argSt, types);
    const agrLeafTypes = new Set(["1sing", "2sing", "3sing", "plural"]);

    const getOrCreateIndex = (expr: FeatureStructure): FeatureStructure => {
        const sem = expr.get("SEM");
        if (!sem) {
            throw new Error("Expression is missing SEM.");
        }
        const existing = sem.get("INDEX");
        if (existing) return existing;

        const created = new FeatureStructure("index");
        sem.add("INDEX", created, types);
        return created;
    };

    const canUnify = (a: FeatureStructure, b: FeatureStructure): boolean => {
        const aCopy = a.deepCopy(new Map(), types);
        const bCopy = b.deepCopy(new Map(), types);
        try {
            FeatureStructure.unify(aCopy, bCopy, types);
            return true;
        } catch {
            return false;
        }
    };

    for (let i = 0; i < args.length; i++) {
        const ana = args[i];

        const mode = ana.getIn(["SEM", "MODE"]);
        if (!mode) continue;
        if (mode.dereference().getType() !== "ana") continue;

        const anaAgr = ana.getIn(["SYN", "HEAD", "AGR"]);
        if (!anaAgr) {
            throw new Error("An anaphor is missing SYN.HEAD.AGR.");
        }
        const anaAgrType = anaAgr.dereference().getType();
        if (!agrLeafTypes.has(anaAgrType)) {
            throw new Error(`An anaphor has underspecified AGR: ${anaAgrType}`);
        }

        const anaIndex = getOrCreateIndex(ana);

        let antecedent: FeatureStructure | undefined;
        for (let j = i - 1; j >= 0; j--) {
            const ant = args[j];
            const antAgr = ant.getIn(["SYN", "HEAD", "AGR"]);
            if (!antAgr) continue;
            if (!canUnify(anaAgr, antAgr)) continue;

            const antIndex = getOrCreateIndex(ant);
            antecedent = ant;

            FeatureStructure.unify(anaAgr, antAgr, types);
            FeatureStructure.unify(anaIndex, antIndex, types);
            break;
        }

        if (!antecedent) {
            throw new Error(`No antecedent for anaphor in ARG-ST (AGR=${anaAgrType}).`);
        }
    }
}
