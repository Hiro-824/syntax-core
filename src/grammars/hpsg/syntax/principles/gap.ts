import { FeatureStructure } from "../../../../features/features.js";
import { TypeSystem } from "../../../../features/types.js";
import { canUnify } from "../../../../features/unification.js";
import { buildExpList, linearizeExpList } from "../../lexicon/valence.js";

function getGapItems(expression: FeatureStructure): FeatureStructure[] {
    const gap = expression.getIn(["SYN", "GAP"]);
    return gap ? linearizeExpList(gap) : [];
}

export function setMotherGapAsSum(
    mother: FeatureStructure,
    head: FeatureStructure,
    nonHeads: FeatureStructure[],
    introducedGaps: FeatureStructure[],
    types: TypeSystem,
): void {
    const gapItems = [
        ...getGapItems(head),
        ...nonHeads.flatMap(getGapItems),
        ...introducedGaps,
    ];

    const stopGap = head.getIn(["SYN", "STOP-GAP"]);
    if (stopGap) {
        const stopItems = linearizeExpList(stopGap);
        const stopItem = stopItems[0];

        if (stopItem) {
            const matchingIndex = gapItems.findIndex(gapItem => canUnify(stopItem, gapItem, types));
            if (matchingIndex < 0) {
                throw new Error("Head STOP-GAP has no unifiable GAP element.");
            }

            FeatureStructure.unify(stopItem, gapItems[matchingIndex]!, types);
            gapItems.splice(matchingIndex, 1);
        }
    }

    const motherSyn = mother.get("SYN");
    if (!motherSyn) {
        throw new Error("Mother is missing SYN.");
    }
    motherSyn.add("GAP", buildExpList(gapItems, types), types);
}
