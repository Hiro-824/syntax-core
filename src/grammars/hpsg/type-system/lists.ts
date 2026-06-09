import { FeatureStructure } from "../../../features/features.js";
import { TypeSystem } from "../../../features/types.js";

export type ListTypeNames = {
    list: string;
    empty: string;
    cons: string;
};

export function linearizeList(
    list: FeatureStructure,
    names: ListTypeNames,
    types?: TypeSystem
): FeatureStructure[] {
    if (types && !types.isSubtype(list.getType(), names.list)) {
        throw new Error(`Cannot linearize non ${names.list}: ${list.getType()}.`);
    }

    const values: FeatureStructure[] = [];
    let current = list.dereference();

    while (current.getType() === names.cons) {
        const first = current.get("FIRST");
        const rest = current.get("REST");
        if (!first || !rest) {
            throw new Error(`Malformed ${names.cons}: missing FIRST and/or REST.`);
        }
        values.push(first);
        current = rest.dereference();
    }

    if (current.getType() !== names.empty) {
        throw new Error(`Malformed ${names.list}: expected ${names.empty}, got ${current.getType()}.`);
    }

    return values;
}

export function buildList(
    values: FeatureStructure[],
    names: ListTypeNames,
    types: TypeSystem
): FeatureStructure {
    if (values.length === 0) return new FeatureStructure(names.empty);

    const [first, ...rest] = values;
    const list = new FeatureStructure(names.cons);
    list.add("FIRST", first!, types);
    list.add("REST", buildList(rest, names, types), types);
    return list;
}

export function concatList(
    prefix: FeatureStructure,
    suffix: FeatureStructure,
    names: ListTypeNames,
    types: TypeSystem
): FeatureStructure {
    return buildList(
        [...linearizeList(prefix, names, types), ...linearizeList(suffix, names, types)],
        names,
        types
    );
}
