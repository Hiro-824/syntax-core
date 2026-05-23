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
import { HPSGBinaryRules } from "./syntax/binary-rules.js";
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
}
