import { FeatureStructure } from "../../../features/features.js";
import { TypeSystem } from "../../../features/types.js";

export function linearizeExpList(list: FeatureStructure): FeatureStructure[] {
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

export function buildExpList(values: FeatureStructure[], types: TypeSystem): FeatureStructure {
    if (values.length === 0) return new FeatureStructure("exp-list-empty");

    const [first, ...rest] = values;
    const list = new FeatureStructure("exp-list-cons");
    list.add("FIRST", first!, types);
    list.add("REST", buildExpList(rest, types), types);
    return list;
}

export function concatExpList(prefix: FeatureStructure, suffix: FeatureStructure, types: TypeSystem): FeatureStructure {
    const p = prefix.dereference();
    const s = suffix.dereference();

    const t = p.getType();
    if (t === "exp-list-empty") return s;
    if (t !== "exp-list-cons") {
        throw new Error(`Unsupported exp-list type for concatenation: ${t}`);
    }

    const first = p.get("FIRST");
    if (!first) {
        throw new Error("Malformed exp-list-cons: missing FIRST.");
    }

    const rest = p.get("REST");
    const newRest = rest ? concatExpList(rest, s, types) : s;

    const out = new FeatureStructure("exp-list-cons");
    out.add("FIRST", first, types);
    out.add("REST", newRest, types);
    return out;
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
