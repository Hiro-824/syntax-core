import { BinaryRules, Lexicon } from "../../core/parser.js";
import { FeatureStructure, FeatureStructureInput } from "../../features/features.js";
import { TypeSystem } from "../../features/types.js";
import { applyHpsgPrinciples } from "./principles/index.js";
import { ruleData, RuleDefinition } from "./rules.js";
import { typeDefinition } from "./types.js";

export type LexiconDefinition = Record<string, FeatureStructureInput[]>;

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

export class HPSGLexicon implements Lexicon<FeatureStructure> {
    private _lexicon: Map<string, FeatureStructure[]> = new Map();
    private compiler: HPSGLexicalEntryCompiler;

    constructor(private types: TypeSystem, definition: LexiconDefinition) {
        this.compiler = new HPSGLexicalEntryCompiler(types);
        this.loadLexicon(definition);
    }

    loadLexicon(definition: LexiconDefinition): void {
        for (const [word, fsDefs] of Object.entries(definition)) {
            const fsList: FeatureStructure[] = [];

            for (const fsDef of fsDefs) {
                try {
                    const fs = this.compiler.compile(fsDef);
                    fsList.push(fs);
                } catch (e) {
                    console.error(`Error loading lexical entry for word "${word}":`, e);
                }
            }

            const existing = this._lexicon.get(word);
            if (existing) {
                existing.push(...fsList);
            } else {
                this._lexicon.set(word, fsList);
            }
        }
    }

    getAvailableWords(): string[] {
        return Array.from(this._lexicon.keys());
    }

    getTerminalCategories(word: string): FeatureStructure[] {
        const masters = this._lexicon.get(word);
        if (!masters) return [];

        return masters.map(fs => fs.deepCopy(new Map(), this.types));
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

    constructor() {
        this.types = new TypeSystem();
        this.types.loadDefinition(typeDefinition);
        this.binaryRules = new HPSGBinaryRules(this.types);
    }

    createLexicon(definition: LexiconDefinition): HPSGLexicon {
        return new HPSGLexicon(this.types, definition);
    }
}
