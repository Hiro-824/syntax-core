import type { TerminalRules } from "../../core/parser.js";
import { FeatureStructure } from "../../features/features.js";
import { HPSG } from "../../grammars/hpsg/hpsg.js";
import { ExampleLexiconDefinition, lexiconData } from "./lexicon-data.js";

export function createExampleHpsgTerminalRules(
    grammar: HPSG,
    definition: ExampleLexiconDefinition = lexiconData
): TerminalRules<FeatureStructure> {
    const entries = new Map<string, FeatureStructure[]>();

    for (const [word, fsDefs] of Object.entries(definition)) {
        entries.set(word, grammar.compileLexicalEntries(fsDefs));
    }

    return word => {
        const masters = entries.get(word);
        if (!masters) return [];
        return masters.map(fs => fs.deepCopy(new Map(), grammar.types));
    };
}
