import { FeatureStructure } from "../../../features/features.js";
import { TypeSystem } from "../../../features/types.js";

function linearizeExpList(list: FeatureStructure): FeatureStructure[] {
    const values: FeatureStructure[] = [];
    let current = list.dereference();

    while (current.getType() === "exp-list-cons") {
        const first = current.get("FIRST");
        const rest = current.get("REST");
        if (!first || !rest) {
            throw new Error("Malformed exp-list-cons: missing FIRST and/or REST.");
        }
        values.push(first);
        current = rest.dereference();
    }

    if (current.getType() !== "exp-list-empty") {
        throw new Error(`Malformed exp-list: expected exp-list-empty, got ${current.getType()}.`);
    }

    return values;
}

function buildExpList(values: FeatureStructure[], types: TypeSystem): FeatureStructure {
    if (values.length === 0) return new FeatureStructure("exp-list-empty");

    const [first, ...rest] = values;
    const list = new FeatureStructure("exp-list-cons");
    list.add("FIRST", first!, types);
    list.add("REST", buildExpList(rest, types), types);
    return list;
}

export function setValenceFromArgSt(synsem: FeatureStructure, types: TypeSystem, context = "lexical rule"): void {
    const argSt = synsem.get("ARG-ST");
    if (!argSt) {
        throw new Error(`Cannot apply ${context}: synsem is missing ARG-ST.`);
    }

    const args = linearizeExpList(argSt);
    if (args.length === 0) {
        throw new Error(`Cannot apply ${context}: ARG-ST must contain a subject.`);
    }

    const val = synsem.getIn(["SYN", "VAL"]);
    if (!val) {
        throw new Error(`Cannot apply ${context}: synsem is missing SYN.VAL.`);
    }

    val.add("SPR", buildExpList([args[0]!], types), types);
    val.add("COMPS", buildExpList(args.slice(1), types), types);
}
