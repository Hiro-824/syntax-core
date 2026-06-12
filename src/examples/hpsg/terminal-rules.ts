import { createTerminalRules, TerminalEntry, TerminalRules } from "../../core/parser.js";
import { FeatureStructure } from "../../features/features.js";
import { HPSG, VerbLexemeInput } from "../../grammars/hpsg/hpsg.js";
import { LexemeInput } from "../../grammars/hpsg/lexicon/lexeme-input.js";
import { lexemeData } from "./lexeme-data.js";

export function createExampleHpsgTerminalRules(
    grammar: HPSG,
    inputs: LexemeInput[] = lexemeData
): TerminalRules<FeatureStructure> {
    const entries = inputs.flatMap(input => buildExampleTerminalEntries(grammar, input));

    return createTerminalRules(entries, category => category.deepCopy(new Map(), grammar.types));
}

function buildExampleTerminalEntries(
    grammar: HPSG,
    input: LexemeInput
): TerminalEntry<FeatureStructure>[] {
    switch (input.type) {
        case "cntn-lxm": {
            const words = grammar.buildCountNounWords(input);
            return [
                { terminal: input.singular, category: words.singular },
                { terminal: input.plural, category: words.plural },
            ];
        }
        case "massn-lxm": {
            const words = grammar.buildMassNounWords(input);
            return [{ terminal: input.form, category: words.singular }];
        }
        case "siv-lxm":
        case "piv-lxm":
        case "stv-lxm":
        case "dtv-lxm":
        case "ptv-lxm":
            return buildExampleVerbTerminalEntries(grammar, input);
        case "pn-lxm":
        case "pron-lxm":
        case "adj-lxm":
        case "adv-lxm":
        case "det-lxm":
        case "argmkp-lxm":
        case "predp-lxm":
        case "part-lxm": {
            const words = grammar.buildConstantWords(input);
            return [{ terminal: input.form, category: words.word }];
        }
    }
}

function buildExampleVerbTerminalEntries(
    grammar: HPSG,
    input: VerbLexemeInput
): TerminalEntry<FeatureStructure>[] {
    const words = grammar.buildVerbWords(input);
    const entries: TerminalEntry<FeatureStructure>[] = [
        { terminal: input.base, category: words.nonThirdSingular },
        { terminal: input.thirdSingular, category: words.thirdSingular },
        { terminal: input.presentParticiple, category: words.presentParticiple },
        { terminal: input.pastTense, category: words.pastTense },
        { terminal: input.pastParticiple, category: words.pastParticiple },
    ];
    if (words.passive) {
        entries.push({ terminal: input.pastParticiple, category: words.passive });
    }
    return entries;
}
