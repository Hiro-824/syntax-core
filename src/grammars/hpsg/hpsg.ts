import { FeatureStructure } from "../../features/features.js";
import { TypeSystem } from "../../features/types.js";
import { buildCompleteLexeme } from "./lexicon/lexeme-builder.js";
import {
    CountNounLexemeInput,
    LexemeInput,
    MassNounLexemeInput,
} from "./lexicon/lexeme-input.js";
import { applyConstantLexemeLexicalRule } from "./lexicon/lexical-rules/constants.js";
import {
    applyPluralNounLexicalRule,
    applySingularNounLexicalRule,
} from "./lexicon/lexical-rules/nouns.js";
import {
    applyBaseFormLexicalRule,
    applyNonThirdSingularVerbLexicalRule,
    applyPastParticipleLexicalRule,
    applyPastTenseVerbLexicalRule,
    applyPresentParticipleLexicalRule,
    applyThirdSingularVerbLexicalRule,
} from "./lexicon/lexical-rules/verbs.js";
import { buildExpList, concatExpList, linearizeExpList } from "./lexicon/valence.js";
import { HPSGBinaryRules } from "./syntax/binary-rules.js";
import { enforceBindingTheory } from "./syntax/principles/binding.js";
import { concatPredList, getRestr } from "./syntax/principles/semantics.js";
import { typeDefinition } from "./type-system/definition.js";

export type VerbLexemeInput = Extract<
    LexemeInput,
    { type: "siv-lxm" | "piv-lxm" | "stv-lxm" | "dtv-lxm" | "ptv-lxm" }
>;

export type ConstantLexemeInput = Extract<
    LexemeInput,
    { type: "pn-lxm" | "pron-lxm" | "adj-lxm" | "adv-lxm" | "det-lxm" | "argmkp-lxm" | "predp-lxm" | "part-lxm" }
>;

export type CountNounWords = {
    singular: FeatureStructure;
    plural: FeatureStructure;
};

export type MassNounWords = {
    singular: FeatureStructure;
};

export type VerbWords = {
    base: FeatureStructure;
    nonThirdSingular: FeatureStructure;
    thirdSingular: FeatureStructure;
    presentParticiple: FeatureStructure;
    pastTense: FeatureStructure;
    pastParticiple: FeatureStructure;
};

export type ConstantWords = {
    word: FeatureStructure;
};

export type IndexedHpsgInput = {
    words: Record<number, FeatureStructure | FeatureStructure[]>;
    head: number;
};

type IndexedWordMap = Map<number, FeatureStructure[]>;

export class HPSG {
    readonly types: TypeSystem;
    readonly binaryRules: HPSGBinaryRules;

    constructor() {
        this.types = new TypeSystem();
        this.types.loadDefinition(typeDefinition);
        this.binaryRules = new HPSGBinaryRules(this.types);
    }

    buildLexeme(input: LexemeInput): FeatureStructure {
        return buildCompleteLexeme(input, this.types);
    }

    combine(left: FeatureStructure, right: FeatureStructure): { category: FeatureStructure; rule: string }[] {
        return this.binaryRules.combine(left, right);
    }

    combineHeadComplement(
        head: FeatureStructure,
        complement: FeatureStructure
    ): { category: FeatureStructure; rule: string }[] {
        return this.binaryRules.combineHeadComplement(head, complement);
    }

    combineHeadSpecifier(
        head: FeatureStructure,
        specifier: FeatureStructure
    ): { category: FeatureStructure; rule: string }[] {
        return this.binaryRules.combineHeadSpecifier(head, specifier);
    }

    combineHeadModifier(
        head: FeatureStructure,
        modifier: FeatureStructure
    ): { category: FeatureStructure; rule: string }[] {
        return this.binaryRules.combineHeadModifier(head, modifier);
    }

    combineIndexed(input: IndexedHpsgInput): FeatureStructure[] {
        const words = this.normalizeIndexedWords(input.words);
        const headCandidates = words.get(input.head);
        if (!headCandidates) return [];

        const results: FeatureStructure[] = [];

        for (const head of headCandidates) {
            results.push(...this.combineIndexedHeadCandidate(words, input.head, head));
        }

        return results;
    }

    applySingularNounRule(lexeme: FeatureStructure): FeatureStructure {
        return applySingularNounLexicalRule(lexeme, this.types);
    }

    applyPluralNounRule(lexeme: FeatureStructure): FeatureStructure {
        return applyPluralNounLexicalRule(lexeme, this.types);
    }

    applyBaseVerbRule(lexeme: FeatureStructure): FeatureStructure {
        return applyBaseFormLexicalRule(lexeme, this.types);
    }

    applyNonThirdSingularVerbRule(lexeme: FeatureStructure): FeatureStructure {
        return applyNonThirdSingularVerbLexicalRule(lexeme, this.types);
    }

    applyThirdSingularVerbRule(lexeme: FeatureStructure): FeatureStructure {
        return applyThirdSingularVerbLexicalRule(lexeme, this.types);
    }

    applyPresentParticipleVerbRule(lexeme: FeatureStructure): FeatureStructure {
        return applyPresentParticipleLexicalRule(lexeme, this.types);
    }

    applyPastTenseVerbRule(lexeme: FeatureStructure): FeatureStructure {
        return applyPastTenseVerbLexicalRule(lexeme, this.types);
    }

    applyPastParticipleVerbRule(lexeme: FeatureStructure): FeatureStructure {
        return applyPastParticipleLexicalRule(lexeme, this.types);
    }

    applyConstantRule(lexeme: FeatureStructure): FeatureStructure {
        return applyConstantLexemeLexicalRule(lexeme, this.types);
    }

    buildCountNounWords(input: CountNounLexemeInput): CountNounWords {
        const lexeme = this.buildLexeme(input);
        return {
            singular: this.applySingularNounRule(lexeme),
            plural: this.applyPluralNounRule(lexeme),
        };
    }

    buildMassNounWords(input: MassNounLexemeInput): MassNounWords {
        const lexeme = this.buildLexeme(input);
        return {
            singular: this.applySingularNounRule(lexeme),
        };
    }

    buildVerbWords(input: VerbLexemeInput): VerbWords {
        const lexeme = this.buildLexeme(input);
        return {
            base: this.applyBaseVerbRule(lexeme),
            nonThirdSingular: this.applyNonThirdSingularVerbRule(lexeme),
            thirdSingular: this.applyThirdSingularVerbRule(lexeme),
            presentParticiple: this.applyPresentParticipleVerbRule(lexeme),
            pastTense: this.applyPastTenseVerbRule(lexeme),
            pastParticiple: this.applyPastParticipleVerbRule(lexeme),
        };
    }

    buildConstantWords(input: ConstantLexemeInput): ConstantWords {
        const lexeme = this.buildLexeme(input);
        return {
            word: this.applyConstantRule(lexeme),
        };
    }

    private normalizeIndexedWords(words: IndexedHpsgInput["words"]): IndexedWordMap {
        const normalized: IndexedWordMap = new Map();

        for (const [positionString, value] of Object.entries(words)) {
            const position = Number(positionString);
            if (!Number.isInteger(position)) {
                throw new Error(`Indexed HPSG input contains a non-integer position: ${positionString}.`);
            }
            normalized.set(position, Array.isArray(value) ? value : [value]);
        }

        return normalized;
    }

    private combineIndexedHeadCandidate(
        words: IndexedWordMap,
        headPosition: number,
        head: FeatureStructure
    ): FeatureStructure[] {
        const positions = [...words.keys()].sort((a, b) => a - b);
        const leftPositions = positions.filter(position => position < headPosition);
        const rightPositions = positions.filter(position => position > headPosition);
        const specifierPosition = leftPositions[0];
        const rightSlotByPosition = new Map<number, number>();

        for (const position of rightPositions) {
            rightSlotByPosition.set(position, position - headPosition - 1);
        }

        const policies = this.buildEdgeGapPolicies(head, specifierPosition !== undefined, rightSlotByPosition);
        const relevantPositions = [
            ...(specifierPosition === undefined ? [] : [specifierPosition]),
            ...rightPositions,
        ];
        const selections = this.buildIndexedSelections(words, relevantPositions);
        const results: FeatureStructure[] = [];

        for (const policy of policies) {
            for (const selection of selections) {
                const copyMemo = new Map<FeatureStructure, FeatureStructure>();
                const candidateHead = head.deepCopy(copyMemo, this.types);
                const candidate = this.applyIndexedPolicy(
                    selection,
                    candidateHead,
                    specifierPosition,
                    rightSlotByPosition,
                    policy,
                    copyMemo,
                );
                if (candidate) results.push(candidate);
            }
        }

        return results;
    }

    private buildIndexedSelections(
        words: IndexedWordMap,
        positions: number[],
    ): Array<Map<number, FeatureStructure>> {
        const [position, ...rest] = positions;
        if (position === undefined) return [new Map()];

        const values = words.get(position);
        if (!values || values.length === 0) return [];

        const tails = this.buildIndexedSelections(words, rest);
        return values.flatMap(value =>
            tails.map(tail => {
                const selection = new Map(tail);
                selection.set(position, value);
                return selection;
            })
        );
    }

    private buildEdgeGapPolicies(
        head: FeatureStructure,
        hasSpecifier: boolean,
        rightSlotByPosition: Map<number, number>
    ): Array<{ gapLeftEdge: boolean; gapRightEdge: boolean }> {
        const spr = head.getIn(["SYN", "VAL", "SPR"]);
        const comps = head.getIn(["SYN", "VAL", "COMPS"]);
        if (!spr || !comps) return [];

        const sprSlots = linearizeExpList(spr);
        const compSlots = linearizeExpList(comps);
        const actualCompSlots = new Set(rightSlotByPosition.values());

        if ([...actualCompSlots].some(slot => slot < 0 || slot >= compSlots.length)) return [];

        const consumedSprCount = hasSpecifier ? 1 : 0;
        if (consumedSprCount > sprSlots.length) return [];

        const hasLeftEdgeMissing = sprSlots.length > consumedSprCount;
        const hasRightEdgeMissing = compSlots.some((_, index) => {
            if (actualCompSlots.has(index)) return false;
            return ![...actualCompSlots].some(actualIndex => actualIndex > index);
        });

        const leftOptions = hasLeftEdgeMissing ? [false, true] : [false];
        const rightOptions = hasRightEdgeMissing ? [false, true] : [false];

        return leftOptions.flatMap(gapLeftEdge =>
            rightOptions.map(gapRightEdge => ({ gapLeftEdge, gapRightEdge }))
        );
    }

    private applyIndexedPolicy(
        selection: Map<number, FeatureStructure>,
        candidateHead: FeatureStructure,
        specifierPosition: number | undefined,
        rightSlotByPosition: Map<number, number>,
        policy: { gapLeftEdge: boolean; gapRightEdge: boolean },
        copyMemo: Map<FeatureStructure, FeatureStructure>,
    ): FeatureStructure | null {
        try {
            const spr = candidateHead.getIn(["SYN", "VAL", "SPR"]);
            const comps = candidateHead.getIn(["SYN", "VAL", "COMPS"]);
            if (!spr || !comps) return null;

            const sprSlots = linearizeExpList(spr);
            const compSlots = linearizeExpList(comps);
            const consumedSpr = new Set<number>();
            const consumedComps = new Set<number>();
            const gapItems: FeatureStructure[] = [];
            const realizedNonHeads: FeatureStructure[] = [];
            let appliedSpecifier = false;

            if (specifierPosition !== undefined) {
                if (sprSlots.length === 0) return null;
                const specifier = this.getSelectedIndexedCandidate(selection, specifierPosition, copyMemo);
                FeatureStructure.unify(sprSlots[0]!, specifier, this.types);
                consumedSpr.add(0);
                realizedNonHeads.push(specifier.dereference());
                appliedSpecifier = true;
            }

            const actualCompSlots = new Set(rightSlotByPosition.values());
            if ([...actualCompSlots].some(slot => slot < 0 || slot >= compSlots.length)) return null;

            for (const [position, slot] of rightSlotByPosition) {
                const complement = this.getSelectedIndexedCandidate(selection, position, copyMemo);
                FeatureStructure.unify(compSlots[slot]!, complement, this.types);
                consumedComps.add(slot);
                realizedNonHeads.push(complement.dereference());
            }

            for (let index = 0; index < sprSlots.length; index++) {
                if (consumedSpr.has(index)) continue;
                if (policy.gapLeftEdge) {
                    gapItems.push(sprSlots[index]!.dereference());
                    consumedSpr.add(index);
                    appliedSpecifier = true;
                }
            }

            for (let index = 0; index < compSlots.length; index++) {
                if (consumedComps.has(index)) continue;

                const isInternalGap = [...actualCompSlots].some(actualIndex => actualIndex > index);
                if (isInternalGap || policy.gapRightEdge) {
                    gapItems.push(compSlots[index]!.dereference());
                    consumedComps.add(index);
                }
            }

            const remainingSpr = sprSlots.filter((_, index) => !consumedSpr.has(index)).map(slot => slot.dereference());
            const remainingComps = compSlots.filter((_, index) => !consumedComps.has(index)).map(slot => slot.dereference());
            const mother = this.buildIndexedMother(candidateHead, remainingSpr, remainingComps, gapItems, realizedNonHeads);

            if (appliedSpecifier) {
                enforceBindingTheory(mother, this.types);
            }

            return mother;
        } catch {
            return null;
        }
    }

    private getSelectedIndexedCandidate(
        selection: Map<number, FeatureStructure>,
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
        gapItems: FeatureStructure[],
        realizedNonHeads: FeatureStructure[],
    ): FeatureStructure {
        const headSyn = head.get("SYN");
        const headSem = head.get("SEM");
        const headArgSt = head.get("ARG-ST");
        const headHead = head.getIn(["SYN", "HEAD"]);
        const headVal = head.getIn(["SYN", "VAL"]);
        const headMod = head.getIn(["SYN", "VAL", "MOD"]);
        if (!headSyn || !headSem || !headArgSt || !headHead || !headVal || !headMod) {
            throw new Error("Cannot build indexed mother: head is missing SYN, SEM, ARG-ST, HEAD, VAL, or MOD.");
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
        syn.add("GAP", this.buildUpdatedGap(headSyn, gapItems), this.types);
        syn.add("STOP-GAP", headSyn.get("STOP-GAP") ?? new FeatureStructure("exp-list-empty"), this.types);

        const mode = headSem.get("MODE");
        const index = headSem.get("INDEX");
        if (mode) sem.add("MODE", mode, this.types);
        if (index) sem.add("INDEX", index, this.types);
        sem.add("RESTR", this.buildIndexedRestr(head, realizedNonHeads), this.types);

        mother.add("ARG-ST", headArgSt, this.types);
        mother.add("SYN", syn, this.types);
        mother.add("SEM", sem, this.types);
        return mother;
    }

    private buildUpdatedGap(headSyn: FeatureStructure, gapItems: FeatureStructure[]): FeatureStructure {
        const existingGap = headSyn.get("GAP") ?? new FeatureStructure("exp-list-empty");
        const newGap = buildExpList(gapItems, this.types);
        return concatExpList(existingGap, newGap, this.types);
    }

    private buildIndexedRestr(head: FeatureStructure, realizedNonHeads: FeatureStructure[]): FeatureStructure {
        return realizedNonHeads.reduce(
            (sum, nonHead) => concatPredList(sum, getRestr(nonHead), this.types),
            getRestr(head)
        );
    }
}
