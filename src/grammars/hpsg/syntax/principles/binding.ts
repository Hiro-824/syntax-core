import { FeatureStructure } from "../../../../features/features.js";
import { TypeSystem } from "../../../../features/types.js";
import { canUnify } from "../../../../features/unification.js";
import { linearizeExpList } from "../../lexicon/valence.js";

export function enforceBindingTheory(mother: FeatureStructure, types: TypeSystem): void {
    const argSt = mother.get("ARG-ST");
    if (!argSt) {
        throw new Error("Mother is missing ARG-ST.");
    }

    const args = linearizeExpList(argSt);

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
        if (!types.isSubtype(anaAgrType, "agr-cat")) {
            throw new Error(`An anaphor has invalid AGR: ${anaAgrType}`);
        }

        const anaIndex = getOrCreateIndex(ana);

        let antecedent: FeatureStructure | undefined;
        for (let j = i - 1; j >= 0; j--) {
            const ant = args[j];
            const antAgr = ant.getIn(["SYN", "HEAD", "AGR"]);
            if (!antAgr) continue;
            if (!canUnify(anaAgr, antAgr, types)) continue;

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
