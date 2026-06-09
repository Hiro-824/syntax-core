import { BinaryRules } from "../../../core/parser.js";
import { FeatureStructure } from "../../../features/features.js";
import { TypeSystem } from "../../../features/types.js";
import { buildExpList, linearizeExpList } from "../lexicon/valence.js";
import { enforceBindingTheory } from "./principles/binding.js";
import { setMotherGapAsSum } from "./principles/gap.js";
import { concatPredList, getRestr } from "./principles/semantics.js";

export type IndexedHpsgRole = "specifier" | "head" | "complement" | "modifier";

export type IndexedHpsgPosition = {
    role: IndexedHpsgRole;
    value?: FeatureStructure | FeatureStructure[] | null;
};

export type IndexedHpsgInput = {
    positions: IndexedHpsgPosition[];
};

type NormalizedPosition = {
    role: IndexedHpsgRole;
    candidates: FeatureStructure[];
};

type IndexedSelection = Map<number, FeatureStructure>;

type GapPolicy = {
    gapLeftEdge: boolean;
    gapRightEdge: boolean;
};

export class HPSGIndexedRules implements BinaryRules<FeatureStructure> {
    readonly binaryRules: BinaryRules<FeatureStructure>;

    constructor(private types: TypeSystem) {
        this.binaryRules = {
            combine: (left, right) => this.combineAdjacent(left, right),
        };
    }

    combine(left: FeatureStructure, right: FeatureStructure): { category: FeatureStructure; rule: string }[] {
        return this.combineAdjacent(left, right);
    }

    combineAdjacent(left: FeatureStructure, right: FeatureStructure): { category: FeatureStructure; rule: string }[] {
        const leftHeadResults = [
            ...this.combineIndexed({
                positions: this.buildArgumentPositions(left, {
                    complement: right,
                }),
            }),
            ...this.combineIndexed({
                positions: [
                    { role: "head", value: left },
                    { role: "modifier", value: right },
                ],
            }),
        ].map(category => ({ category, rule: "indexed-left-head" }));

        const rightHeadResults = [
            ...this.combineIndexed({
                positions: this.buildArgumentPositions(right, {
                    specifier: left,
                }),
            }),
            ...this.combineIndexed({
                positions: [
                    { role: "modifier", value: left },
                    { role: "head", value: right },
                ],
            }),
        ].map(category => ({ category, rule: "indexed-right-head" }));

        return [...leftHeadResults, ...rightHeadResults];
    }

    combineHeadComplement(
        head: FeatureStructure,
        complement: FeatureStructure
    ): { category: FeatureStructure; rule: string }[] {
        return this.combineIndexed({
            positions: this.buildArgumentPositions(head, { complement }),
        }).map(category => ({ category, rule: "indexed-head-complement" }));
    }

    combineHeadSpecifier(
        head: FeatureStructure,
        specifier: FeatureStructure
    ): { category: FeatureStructure; rule: string }[] {
        return this.combineIndexed({
            positions: this.buildArgumentPositions(head, { specifier }),
        }).map(category => ({ category, rule: "indexed-head-specifier" }));
    }

    combineHeadModifier(
        head: FeatureStructure,
        modifier: FeatureStructure
    ): { category: FeatureStructure; rule: string }[] {
        return this.combineIndexed({
            positions: [
                { role: "head", value: head },
                { role: "modifier", value: modifier },
            ],
        }).map(category => ({ category, rule: "indexed-head-modifier" }));
    }

    combineIndexed(input: IndexedHpsgInput): FeatureStructure[] {
        const positions = this.normalizePositions(input.positions);
        const headIndices = positions.flatMap((position, index) =>
            position.role === "head" ? [index] : []
        );

        if (headIndices.length !== 1) {
            throw new Error(`Indexed HPSG input must contain exactly one head position.`);
        }

        const headIndex = headIndices[0]!;
        const headCandidates = positions[headIndex]!.candidates;
        if (headCandidates.length === 0) {
            throw new Error(`Indexed HPSG head position must contain at least one candidate.`);
        }
        positions.forEach((position, index) => {
            if (position.role === "specifier" && index > headIndex) {
                throw new Error(`Indexed HPSG specifier positions must precede the head.`);
            }
            if (position.role === "complement" && index < headIndex) {
                throw new Error(`Indexed HPSG complement positions must follow the head.`);
            }
            if (position.role === "modifier" && position.candidates.length === 0) {
                throw new Error(`Indexed HPSG modifier positions must contain at least one candidate.`);
            }
        });

        return headCandidates.flatMap(head =>
            this.combineIndexedHeadCandidate(positions, headIndex, head)
        );
    }

    private normalizePositions(positions: IndexedHpsgPosition[]): NormalizedPosition[] {
        return positions.map(position => ({
            role: position.role,
            candidates: position.value == null
                ? []
                : Array.isArray(position.value)
                    ? position.value
                    : [position.value],
        }));
    }

    private buildArgumentPositions(
        head: FeatureStructure,
        realized: {
            specifier?: FeatureStructure;
            complement?: FeatureStructure;
        },
    ): IndexedHpsgPosition[] {
        const sprSlots = this.linearizeHeadValence(head, "SPR");
        const compSlots = this.linearizeHeadValence(head, "COMPS");
        const specifiers = sprSlots.map((_, index): IndexedHpsgPosition => ({
            role: "specifier",
            value: index === 0 ? realized.specifier : undefined,
        }));
        const complements = compSlots.map((_, index): IndexedHpsgPosition => ({
            role: "complement",
            value: index === 0 ? realized.complement : undefined,
        }));

        if (realized.specifier && specifiers.length === 0) {
            specifiers.push({ role: "specifier", value: realized.specifier });
        }
        if (realized.complement && complements.length === 0) {
            complements.push({ role: "complement", value: realized.complement });
        }

        return [
            ...specifiers,
            { role: "head", value: head },
            ...complements,
        ];
    }

    private combineIndexedHeadCandidate(
        positions: NormalizedPosition[],
        headIndex: number,
        head: FeatureStructure
    ): FeatureStructure[] {
        const selectionIndices = positions.flatMap((position, index) =>
            index !== headIndex && position.candidates.length > 0 ? [index] : []
        );
        const selections = this.buildIndexedSelections(positions, selectionIndices);
        const policies = this.buildEdgeGapPolicies(head, positions);
        const results: FeatureStructure[] = [];

        for (const policy of policies) {
            for (const selection of selections) {
                const copyMemo = new Map<FeatureStructure, FeatureStructure>();
                const candidateHead = head.deepCopy(copyMemo, this.types);
                const candidate = this.applyIndexedPolicy(
                    positions,
                    selection,
                    candidateHead,
                    policy,
                    copyMemo,
                );
                if (candidate) results.push(candidate);
            }
        }

        return results;
    }

    private buildIndexedSelections(
        positions: NormalizedPosition[],
        indices: number[],
    ): IndexedSelection[] {
        const [index, ...rest] = indices;
        if (index === undefined) return [new Map()];

        const values = positions[index]!.candidates;
        const tails = this.buildIndexedSelections(positions, rest);
        return values.flatMap(value =>
            tails.map(tail => {
                const selection = new Map(tail);
                selection.set(index, value);
                return selection;
            })
        );
    }

    private buildEdgeGapPolicies(
        head: FeatureStructure,
        positions: NormalizedPosition[],
    ): GapPolicy[] {
        const spr = head.getIn(["SYN", "VAL", "SPR"]);
        const comps = head.getIn(["SYN", "VAL", "COMPS"]);
        if (!spr || !comps) return [];

        const sprSlots = linearizeExpList(spr);
        const compSlots = linearizeExpList(comps);
        const specifierPositions = positions.filter(position => position.role === "specifier");
        const complementPositions = positions.filter(position => position.role === "complement");

        if (specifierPositions.length > sprSlots.length || complementPositions.length > compSlots.length) {
            return [];
        }

        const occupiedSpr = new Set(
            specifierPositions.flatMap((position, index) =>
                position.candidates.length > 0 ? [index] : []
            )
        );
        const occupiedComps = new Set(
            complementPositions.flatMap((position, index) =>
                position.candidates.length > 0 ? [index] : []
            )
        );
        const internalSpr = this.findInternalMissingSlots(sprSlots.length, occupiedSpr);
        const internalComps = this.findInternalMissingSlots(compSlots.length, occupiedComps);
        const hasLeftEdgeMissing = specifierPositions.some((_, index) =>
            !occupiedSpr.has(index) && !internalSpr.has(index)
        );
        const hasRightEdgeMissing = complementPositions.some((_, index) =>
            !occupiedComps.has(index) && !internalComps.has(index)
        );

        const leftOptions = hasLeftEdgeMissing ? [false, true] : [false];
        const rightOptions = hasRightEdgeMissing ? [false, true] : [false];

        return leftOptions.flatMap(gapLeftEdge =>
            rightOptions.map(gapRightEdge => ({ gapLeftEdge, gapRightEdge }))
        );
    }

    private findInternalMissingSlots(slotCount: number, occupiedSlots: Set<number>): Set<number> {
        const internal = new Set<number>();

        for (let index = 0; index < slotCount; index++) {
            if (occupiedSlots.has(index)) continue;
            if ([...occupiedSlots].some(occupiedIndex => occupiedIndex > index)) {
                internal.add(index);
            }
        }

        return internal;
    }

    private applyIndexedPolicy(
        positions: NormalizedPosition[],
        selection: IndexedSelection,
        candidateHead: FeatureStructure,
        policy: GapPolicy,
        copyMemo: Map<FeatureStructure, FeatureStructure>,
    ): FeatureStructure | null {
        try {
            const spr = candidateHead.getIn(["SYN", "VAL", "SPR"]);
            const comps = candidateHead.getIn(["SYN", "VAL", "COMPS"]);
            if (!spr || !comps) return null;

            const sprSlots = linearizeExpList(spr);
            const compSlots = linearizeExpList(comps);
            const specifierPositions = positions.flatMap((position, index) =>
                position.role === "specifier" ? [{ position, index }] : []
            );
            const complementPositions = positions.flatMap((position, index) =>
                position.role === "complement" ? [{ position, index }] : []
            );
            const occupiedSpr = new Set<number>();
            const occupiedComps = new Set<number>();
            const gapItems: FeatureStructure[] = [];
            const realizedByPosition = new Map<number, FeatureStructure>();
            let appliedSpecifier = false;

            for (let slot = 0; slot < specifierPositions.length; slot++) {
                const entry = specifierPositions[slot]!;
                if (entry.position.candidates.length === 0) continue;

                const specifier = this.getSelectedCandidate(selection, entry.index, copyMemo);
                FeatureStructure.unify(sprSlots[slot]!, specifier, this.types);
                occupiedSpr.add(slot);
                realizedByPosition.set(entry.index, specifier.dereference());
                appliedSpecifier = true;
            }

            for (let slot = 0; slot < complementPositions.length; slot++) {
                const entry = complementPositions[slot]!;
                if (entry.position.candidates.length === 0) continue;

                const complement = this.getSelectedCandidate(selection, entry.index, copyMemo);
                FeatureStructure.unify(compSlots[slot]!, complement, this.types);
                occupiedComps.add(slot);
                realizedByPosition.set(entry.index, complement.dereference());
            }

            const internalSpr = this.findInternalMissingSlots(sprSlots.length, occupiedSpr);
            const internalComps = this.findInternalMissingSlots(compSlots.length, occupiedComps);
            const consumedSpr = new Set(occupiedSpr);
            const consumedComps = new Set(occupiedComps);

            for (let index = 0; index < sprSlots.length; index++) {
                if (consumedSpr.has(index)) continue;
                const isDeclared = index < specifierPositions.length;
                if (internalSpr.has(index) || isDeclared && policy.gapLeftEdge) {
                    gapItems.push(sprSlots[index]!.dereference());
                    consumedSpr.add(index);
                    appliedSpecifier = true;
                }
            }

            for (let index = 0; index < compSlots.length; index++) {
                if (consumedComps.has(index)) continue;
                const isDeclared = index < complementPositions.length;
                if (internalComps.has(index) || isDeclared && policy.gapRightEdge) {
                    gapItems.push(compSlots[index]!.dereference());
                    consumedComps.add(index);
                }
            }

            const remainingSpr = sprSlots
                .filter((_, index) => !consumedSpr.has(index))
                .map(slot => slot.dereference());
            const remainingComps = compSlots
                .filter((_, index) => !consumedComps.has(index))
                .map(slot => slot.dereference());

            for (let index = 0; index < positions.length; index++) {
                const position = positions[index]!;
                if (position.role !== "modifier" || position.candidates.length === 0) continue;

                const modifier = this.getSelectedCandidate(selection, index, copyMemo);
                this.unifyModifierTarget(candidateHead, modifier);
                realizedByPosition.set(index, modifier.dereference());
            }

            const realizedNonHeads = [...realizedByPosition.entries()]
                .sort(([left], [right]) => left - right)
                .map(([, nonHead]) => nonHead);
            const mother = this.buildIndexedMother(
                candidateHead,
                remainingSpr,
                remainingComps,
                gapItems,
                realizedNonHeads,
            );

            if (appliedSpecifier) {
                enforceBindingTheory(mother, this.types);
            }

            return mother;
        } catch {
            return null;
        }
    }

    private unifyModifierTarget(head: FeatureStructure, modifier: FeatureStructure): void {
        const modifierSpr = modifier.getIn(["SYN", "VAL", "SPR"]);
        const modifierComps = modifier.getIn(["SYN", "VAL", "COMPS"]);
        const modifierMod = modifier.getIn(["SYN", "VAL", "MOD"]);
        if (!modifierSpr || !modifierComps || !modifierMod) {
            throw new Error(`Modifier is missing SPR, COMPS, or MOD.`);
        }
        if (linearizeExpList(modifierSpr).length !== 0) {
            throw new Error(`Modifier must have an empty SPR list.`);
        }
        if (linearizeExpList(modifierComps).length !== 0) {
            throw new Error(`Modifier must have an empty COMPS list.`);
        }

        const modifierTargets = linearizeExpList(modifierMod);
        if (modifierTargets.length === 0) {
            throw new Error(`Modifier must declare a MOD target.`);
        }

        FeatureStructure.unify(modifierTargets[0]!, head, this.types);
    }

    private linearizeHeadValence(head: FeatureStructure, attribute: "SPR" | "COMPS"): FeatureStructure[] {
        const list = head.getIn(["SYN", "VAL", attribute]);
        if (!list) {
            throw new Error(`Cannot linearize head ${attribute}: missing SYN.VAL.${attribute}.`);
        }
        return linearizeExpList(list).map(item => item.dereference());
    }

    private getSelectedCandidate(
        selection: IndexedSelection,
        position: number,
        copyMemo: Map<FeatureStructure, FeatureStructure>
    ): FeatureStructure {
        const value = selection.get(position);
        if (!value) {
            throw new Error(`Indexed HPSG position ${position} is missing from candidate selection.`);
        }
        return value.deepCopy(copyMemo, this.types);
    }

    private buildIndexedMother(
        head: FeatureStructure,
        remainingSpr: FeatureStructure[],
        remainingComps: FeatureStructure[],
        introducedGaps: FeatureStructure[],
        realizedNonHeads: FeatureStructure[],
    ): FeatureStructure {
        const headSem = head.get("SEM");
        const headArgSt = head.get("ARG-ST");
        const headHead = head.getIn(["SYN", "HEAD"]);
        const headMod = head.getIn(["SYN", "VAL", "MOD"]);
        if (!headSem || !headArgSt || !headHead || !headMod) {
            throw new Error("Cannot build indexed mother: head is missing SEM, ARG-ST, HEAD, or MOD.");
        }

        const mother = new FeatureStructure("phrase");
        const syn = new FeatureStructure("syn-cat");
        const val = new FeatureStructure("val-cat");
        const sem = new FeatureStructure("sem-cat");

        val.add("SPR", buildExpList(remainingSpr, this.types), this.types);
        val.add("COMPS", buildExpList(remainingComps, this.types), this.types);
        val.add("MOD", headMod, this.types);

        syn.add("HEAD", headHead, this.types);
        syn.add("VAL", val, this.types);

        const mode = headSem.get("MODE");
        const index = headSem.get("INDEX");
        if (mode) sem.add("MODE", mode, this.types);
        if (index) sem.add("INDEX", index, this.types);
        sem.add("RESTR", this.buildIndexedRestr(head, realizedNonHeads), this.types);

        mother.add("ARG-ST", headArgSt, this.types);
        mother.add("SYN", syn, this.types);
        mother.add("SEM", sem, this.types);
        setMotherGapAsSum(mother, head, realizedNonHeads, introducedGaps, this.types);
        return mother;
    }

    private buildIndexedRestr(head: FeatureStructure, realizedNonHeads: FeatureStructure[]): FeatureStructure {
        return realizedNonHeads.reduce(
            (sum, nonHead) => concatPredList(sum, getRestr(nonHead), this.types),
            getRestr(head)
        );
    }
}
