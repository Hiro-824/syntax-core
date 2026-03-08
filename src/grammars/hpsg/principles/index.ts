import { FeatureStructure } from "../../../features/features.js";
import { TypeSystem } from "../../../features/types.js";
import { enforceBindingTheory } from "./binding.js";
import { setMotherRestrAsSum } from "./semantics.js";

type PrincipleContext = {
    ruleName: string;
    mother: FeatureStructure;
    head: FeatureStructure;
    nonHead: FeatureStructure;
    types: TypeSystem;
};

export function applyHpsgPrinciples(context: PrincipleContext): void {
    const { ruleName, mother, head, nonHead, types } = context;

    setMotherRestrAsSum(mother, head, nonHead, types);
    if (ruleName === "head-specifier") {
        enforceBindingTheory(mother, types);
    }
}
