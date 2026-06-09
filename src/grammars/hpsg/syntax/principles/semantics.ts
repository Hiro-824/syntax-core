import { FeatureStructure } from "../../../../features/features.js";
import { TypeSystem } from "../../../../features/types.js";
import { concatList } from "../../type-system/lists.js";

const predListTypes = {
    list: "pred-list",
    empty: "pred-list-empty",
    cons: "pred-list-cons",
};

export function getRestr(expr: FeatureStructure): FeatureStructure {
    const restr = expr.getIn(["SEM", "RESTR"]);
    return restr ?? new FeatureStructure("pred-list-empty");
}

export function concatPredList(prefix: FeatureStructure, suffix: FeatureStructure, types: TypeSystem): FeatureStructure {
    return concatList(prefix, suffix, predListTypes, types);
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
