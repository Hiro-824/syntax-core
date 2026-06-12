import { BinaryRules } from "../../core/parser.js";
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
    applyPassiveLexicalRule,
    applyPastParticipleLexicalRule,
    applyPastTenseVerbLexicalRule,
    applyPresentParticipleLexicalRule,
    applyThirdSingularVerbLexicalRule,
} from "./lexicon/lexical-rules/verbs.js";
import { HPSGIndexedRules, IndexedHpsgInput } from "./syntax/indexed-rules.js";
import { typeDefinition } from "./type-system/definition.js";

export type {
    IndexedHpsgInput,
    IndexedHpsgPosition,
    IndexedHpsgRole,
} from "./syntax/indexed-rules.js";

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
    passive?: FeatureStructure;
};

export type ConstantWords = {
    word: FeatureStructure;
};

export class HPSG {
    readonly types: TypeSystem;
    readonly binaryRules: BinaryRules<FeatureStructure>;
    readonly indexedRules: HPSGIndexedRules;

    constructor() {
        this.types = new TypeSystem();
        this.types.loadDefinition(typeDefinition);
        this.indexedRules = new HPSGIndexedRules(this.types);
        this.binaryRules = this.indexedRules.binaryRules;
    }

    buildLexeme(input: LexemeInput): FeatureStructure {
        return buildCompleteLexeme(input, this.types);
    }

    combine(left: FeatureStructure, right: FeatureStructure): { category: FeatureStructure; rule: string }[] {
        return this.combineAdjacent(left, right);
    }

    combineAdjacent(left: FeatureStructure, right: FeatureStructure): { category: FeatureStructure; rule: string }[] {
        return this.indexedRules.combineAdjacent(left, right);
    }

    combineHeadComplement(
        head: FeatureStructure,
        complement: FeatureStructure
    ): { category: FeatureStructure; rule: string }[] {
        return this.indexedRules.combineHeadComplement(head, complement);
    }

    combineHeadSpecifier(
        head: FeatureStructure,
        specifier: FeatureStructure
    ): { category: FeatureStructure; rule: string }[] {
        return this.indexedRules.combineHeadSpecifier(head, specifier);
    }

    combineHeadModifier(
        head: FeatureStructure,
        modifier: FeatureStructure
    ): { category: FeatureStructure; rule: string }[] {
        return this.indexedRules.combineHeadModifier(head, modifier);
    }

    combineIndexed(input: IndexedHpsgInput): FeatureStructure[] {
        return this.indexedRules.combineIndexed(input);
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

    applyPassiveVerbRule(lexeme: FeatureStructure): FeatureStructure {
        return applyPassiveLexicalRule(lexeme, this.types);
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
        const words: VerbWords = {
            base: this.applyBaseVerbRule(lexeme),
            nonThirdSingular: this.applyNonThirdSingularVerbRule(lexeme),
            thirdSingular: this.applyThirdSingularVerbRule(lexeme),
            presentParticiple: this.applyPresentParticipleVerbRule(lexeme),
            pastTense: this.applyPastTenseVerbRule(lexeme),
            pastParticiple: this.applyPastParticipleVerbRule(lexeme),
        };
        if (this.types.isSubtype(lexeme.getType(), "tv-lxm")) {
            words.passive = this.applyPassiveVerbRule(lexeme);
        }
        return words;
    }

    buildConstantWords(input: ConstantLexemeInput): ConstantWords {
        const lexeme = this.buildLexeme(input);
        return {
            word: this.applyConstantRule(lexeme),
        };
    }

}
