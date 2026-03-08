import { FeatureStructure } from "../../../features/features.js";
import { TypeSystem } from "../../../features/types.js";

function getRestr(expr: FeatureStructure): FeatureStructure {
    const restr = expr.getIn(["SEM", "RESTR"]);
    return restr ?? new FeatureStructure("pred-list-empty");
}

function concatPredList(prefix: FeatureStructure, suffix: FeatureStructure, types: TypeSystem): FeatureStructure {
    const p = prefix.dereference();
    const s = suffix.dereference();

    const t = p.getType();
    if (t === "pred-list-empty") return s;
    if (t !== "pred-list-cons") {
        throw new Error(`Unsupported pred-list type for concatenation: ${t}`);
    }

    const first = p.get("FIRST");
    if (!first) {
        throw new Error(`Malformed pred-list-cons: missing FIRST`);
    }

    const rest = p.get("REST");
    const newRest = rest ? concatPredList(rest, s, types) : s;

    const out = new FeatureStructure("pred-list-cons");
    out.add("FIRST", first, types);
    out.add("REST", newRest, types);
    return out;
}

export function setMotherRestrAsSum(
    mother: FeatureStructure,
    head: FeatureStructure,
    nonHead: FeatureStructure,
    types: TypeSystem,
): void {
    const headRestr = getRestr(head);
    const nonHeadRestr = getRestr(nonHead);
    const summed = concatPredList(headRestr, nonHeadRestr, types);

    const motherSem = mother.get("SEM");
    if (!motherSem) {
        throw new Error("Mother is missing SEM");
    }

    motherSem.add("RESTR", summed, types);
}
