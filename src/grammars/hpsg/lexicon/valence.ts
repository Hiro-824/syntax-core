import { FeatureStructure } from "../../../features/features.js";
import { TypeSystem } from "../../../features/types.js";
import { buildList, concatList, linearizeList } from "../type-system/lists.js";

const expListTypes = {
    list: "exp-list",
    empty: "exp-list-empty",
    cons: "exp-list-cons",
};

export function linearizeExpList(list: FeatureStructure): FeatureStructure[] {
    return linearizeList(list, expListTypes);
}

export function buildExpList(values: FeatureStructure[], types: TypeSystem): FeatureStructure {
    return buildList(values, expListTypes, types);
}

export function concatExpList(prefix: FeatureStructure, suffix: FeatureStructure, types: TypeSystem): FeatureStructure {
    return concatList(prefix, suffix, expListTypes, types);
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
