import { BinaryRules } from "../../../core/parser.js";
import { FeatureStructure } from "../../../features/features.js";
import { TypeSystem } from "../../../features/types.js";
import { applyHpsgPrinciples } from "./principles/index.js";
import { ruleData, RuleDefinition } from "./rule-schema.js";

type CombineResult = { category: FeatureStructure; rule: string };

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

    combine(left: FeatureStructure, right: FeatureStructure): CombineResult[] {
        const results: CombineResult[] = [];

        results.push(...this.applyNamedRule("head-specifier", right, left));
        results.push(...this.applyNamedRule("head-complement", left, right));
        results.push(...this.applyNamedRule("head-modifier", left, right));

        return results;
    }

    combineHeadComplement(head: FeatureStructure, complement: FeatureStructure): CombineResult[] {
        return this.applyNamedRule("head-complement", head, complement);
    }

    combineHeadSpecifier(head: FeatureStructure, specifier: FeatureStructure): CombineResult[] {
        return this.applyNamedRule("head-specifier", head, specifier);
    }

    combineHeadModifier(head: FeatureStructure, modifier: FeatureStructure): CombineResult[] {
        return this.applyNamedRule("head-modifier", head, modifier);
    }

    private applyNamedRule(
        ruleName: "head-complement" | "head-specifier" | "head-modifier",
        head: FeatureStructure,
        nonHead: FeatureStructure
    ): CombineResult[] {
        const ruleSchema = this._rules.get(ruleName);
        if (!ruleSchema) return [];

        const context = new Map<FeatureStructure, FeatureStructure>();
        const schema = ruleSchema.deepCopy(context, this.types);
        const candidateHead = head.deepCopy(context, this.types);
        const candidateNonHead = nonHead.deepCopy(context, this.types);

        const targetHead = schema.get("HEAD-DTR");
        const targetNonHead = schema.get("NON-HEAD-DTR");
        const targetMother = schema.get("MOTHER");

        if (!targetHead || !targetNonHead || !targetMother) {
            console.error(`Invalid rule schema: ${ruleName}`);
            return [];
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
            return [{ category: targetMother, rule: ruleName }];
        } catch {
            // Rule application failure is expected for many candidates.
            return [];
        }
    }
}
