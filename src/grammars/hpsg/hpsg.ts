import { BinaryRules } from "../../core/parser.js";
import { FeatureStructure, FeatureStructureInput } from "../../features/features.js";
import { TypeSystem } from "../../features/types.js";
import { applyConstantLexemeLexicalRule } from "./generation/const-rules.js";
import {
    applyPluralNounLexicalRule,
    applySingularNounLexicalRule,
} from "./generation/noun-rules.js";
import { buildCompleteLexeme } from "./generation/type-constraint-applier.js";
import {
    applyBaseFormLexicalRule,
    applyNonThirdSingularVerbLexicalRule,
    applyPastParticipleLexicalRule,
    applyPastTenseVerbLexicalRule,
    applyPresentParticipleLexicalRule,
    applyThirdSingularVerbLexicalRule,
} from "./generation/verb-rules.js";
import {
    CountNounLexemeInput,
    LexemeInput,
    MassNounLexemeInput,
} from "./lexemes/types.js";
import { applyHpsgPrinciples } from "./principles/index.js";
import { ruleData, RuleDefinition } from "./rules.js";
import { typeDefinition } from "./types.js";

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

export class HPSGLexicalEntryCompiler {
    constructor(private types: TypeSystem) {}
    
    private ensureRelnSubtype(relnName: string): void {
        if (relnName === "reln") return;

        if (this.types.hasType(relnName)) {
            if (!this.types.isSubtype(relnName, "reln")) {
                console.warn(
                    `Type "${relnName}" already exists but is not a subtype of "reln"; skipping auto-add.`
                );
            }
            return;
        }
        
        this.types.addType(relnName, "reln");
    }

    private collectRelnTypes(input: unknown): Set<string> {
        const relns = new Set<string>();

        const visit = (node: unknown) => {
            if (typeof node === "string") return;
            if (Array.isArray(node)) {
                for (const item of node) visit(item);
                return;
            }
            if (node === null || typeof node !== "object") return;

            for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
                if (key === "RELN" && typeof value === "string" && !value.startsWith("#")) {
                    relns.add(value);
                    continue;
                }
                visit(value);
            }
        };

        visit(input);
        return relns;
    }

    prepareTypes(input: FeatureStructureInput): void {
        for (const relnName of this.collectRelnTypes(input)) {
            this.ensureRelnSubtype(relnName);
        }
    }

    compile(input: FeatureStructureInput): FeatureStructure {
        this.prepareTypes(input);
        return FeatureStructure.fromJSON(input, this.types);
    }

    compileMany(inputs: FeatureStructureInput[]): FeatureStructure[] {
        return inputs.map(input => this.compile(input));
    }
}

export class HPSGBinaryRules implements BinaryRules<FeatureStructure> {

    private _rules: Map<string, FeatureStructure> = new Map();

    constructor(private types: TypeSystem, schemas: RuleDefinition = ruleData) {
        this.loadRules(schemas);
    }

    loadRules(schemas: RuleDefinition) {
        for (const [name, schema] of Object.entries(schemas)) {
            try {
                const fs = FeatureStructure.fromJSON(schema, this.types);
                this._rules.set(name, fs);
            } catch (e) {
                console.error(`Failed to load rule ${name}:`, e);
            }
        }
    }

    combine(left: FeatureStructure, right: FeatureStructure): { category: FeatureStructure; rule: string }[] {
        const results: { category: FeatureStructure; rule: string }[] = [];

        for (const [ruleName, ruleSchema] of this._rules.entries()) {
            const context = new Map<FeatureStructure, FeatureStructure>();

            const schema = ruleSchema.deepCopy(context, this.types);
            const leftCopy = left.deepCopy(context, this.types);
            const rightCopy = right.deepCopy(context, this.types);

            let targetHead: FeatureStructure;
            let targetNonHead: FeatureStructure;
            let targetMother: FeatureStructure;

            let candidateHead: FeatureStructure;
            let candidateNonHead: FeatureStructure;

            try {
                targetHead = schema.get("HEAD-DTR")!;
                targetNonHead = schema.get("NON-HEAD-DTR")!;
                targetMother = schema.get("MOTHER")!;
            } catch (e) {
                console.error(`Invalid rule schema: ${ruleName}, ${e}`);
                continue;
            }

            if (ruleName === "head-complement") {
                candidateHead = leftCopy;
                candidateNonHead = rightCopy;
            } else if (ruleName === "head-specifier") {
                candidateHead = rightCopy;
                candidateNonHead = leftCopy;
            } else if (ruleName === "head-modifier") {
                candidateHead = leftCopy;
                candidateNonHead = rightCopy;
            } else {
                continue; // 未対応のルール
            }

            try {
                FeatureStructure.unify(targetHead, candidateHead, this.types);
                FeatureStructure.unify(targetNonHead, candidateNonHead, this.types);
                applyHpsgPrinciples({
                    ruleName,
                    mother: targetMother,
                    head: candidateHead,
                    nonHead: candidateNonHead,
                    types: this.types,
                });
                results.push({ category: targetMother, rule: ruleName });
            } catch {
                // Rule application failure is expected for many candidates.
            }
        }

        return results;
    }
}

export class HPSG {
    readonly types: TypeSystem;
    readonly binaryRules: HPSGBinaryRules;
    private lexicalEntryCompiler: HPSGLexicalEntryCompiler;

    constructor() {
        this.types = new TypeSystem();
        this.types.loadDefinition(typeDefinition);
        this.binaryRules = new HPSGBinaryRules(this.types);
        this.lexicalEntryCompiler = new HPSGLexicalEntryCompiler(this.types);
    }

    compileLexicalEntry(input: FeatureStructureInput): FeatureStructure {
        return this.lexicalEntryCompiler.compile(input);
    }

    compileLexicalEntries(inputs: FeatureStructureInput[]): FeatureStructure[] {
        return this.lexicalEntryCompiler.compileMany(inputs);
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
