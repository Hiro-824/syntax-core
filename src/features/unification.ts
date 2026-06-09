import { FeatureStructure } from "./features.js";
import { TypeSystem } from "./types.js";

export function canUnify(
    left: FeatureStructure,
    right: FeatureStructure,
    types: TypeSystem
): boolean {
    const leftCopy = left.deepCopy(new Map(), types);
    const rightCopy = right.deepCopy(new Map(), types);

    try {
        FeatureStructure.unify(leftCopy, rightCopy, types);
        return true;
    } catch {
        return false;
    }
}
