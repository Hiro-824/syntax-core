import { HPSG, HPSGLexicon, parse } from "./index.js";
import {
    applyPluralNounLexicalRule,
    applySingularNounLexicalRule,
    buildCompleteLexeme,
} from "./grammars/hpsg/lexical-entry-generator.js";
import { lexemeData } from "./grammars/hpsg/lexemes/data.js";

type ParseExpectation = {
    sentence: string;
    parses: number;
    topRule?: string;
};

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}

function runHpsgParseTests(): void {
    const grammar = new HPSG();
    const lexicon = new HPSGLexicon(grammar.types);

    const cases: ParseExpectation[] = [
        { sentence: "john sees mary", parses: 1, topRule: "head-specifier" },
        { sentence: "john see mary", parses: 0 },
        { sentence: "i see myself", parses: 1, topRule: "head-specifier" },
        { sentence: "me see myself", parses: 0 },
        { sentence: "see mary", parses: 1, topRule: "head-complement" },
        { sentence: "john sees mary with the telescope", parses: 3 },
        { sentence: "the telescope", parses: 1, topRule: "head-specifier" },
        { sentence: "a water", parses: 0 },
    ];

    for (const testCase of cases) {
        const words = testCase.sentence.split(" ");
        const trees = parse(words, grammar, lexicon);

        assert(
            trees.length === testCase.parses,
            `${testCase.sentence}: expected ${testCase.parses} parse(s), got ${trees.length}.`
        );

        if (testCase.topRule) {
            assert(
                trees[0]?.rule === testCase.topRule,
                `${testCase.sentence}: expected top rule ${testCase.topRule}, got ${trees[0]?.rule ?? "none"}.`
            );
        }
    }
}

runHpsgParseTests();
runLexemeGeneratorTests();
console.log("HPSG tests passed.");

function runLexemeGeneratorTests(): void {
    const grammar = new HPSG();
    const girl = buildCompleteLexeme(lexemeData[0]!, grammar.types);
    const water = buildCompleteLexeme(lexemeData[2]!, grammar.types);

    assert(girl.getType() === "cntn-lxm", `girl: expected cntn-lxm, got ${girl.getType()}.`);
    assert(water.getType() === "massn-lxm", `water: expected massn-lxm, got ${water.getType()}.`);

    assert(
        girl.getIn(["SYN", "HEAD"])?.getType() === "noun",
        `girl: expected SYN.HEAD to be noun.`
    );
    assert(
        girl.getIn(["SYN", "HEAD", "AGR", "PER"])?.getType() === "3rd",
        `girl: expected SYN.HEAD.AGR.PER to be 3rd.`
    );
    assert(
        girl.getIn(["SYN", "VAL", "SPR", "FIRST", "SYN", "HEAD", "COUNT"])?.getType() === "+",
        `girl: expected SPR determiner COUNT to be +.`
    );
    assert(
        water.getIn(["SYN", "VAL", "SPR", "FIRST", "SYN", "HEAD", "COUNT"])?.getType() === "-",
        `water: expected SPR determiner COUNT to be -.`
    );
    assert(
        girl.getIn(["SYN", "VAL", "MOD"])?.getType() === "exp-list-empty",
        `girl: expected default MOD to be empty.`
    );
    assert(
        girl.getIn(["SEM", "RESTR", "FIRST", "RELN"])?.getType() === "girl",
        `girl: expected RELN to be girl.`
    );

    const singularGirl = applySingularNounLexicalRule(girl, grammar.types);
    const pluralGirl = applyPluralNounLexicalRule(girl, grammar.types);

    assert(singularGirl.getType() === "word", `singular girl: expected word.`);
    assert(pluralGirl.getType() === "word", `plural girl: expected word.`);
    assert(
        singularGirl.getIn(["SYN", "HEAD", "AGR", "NUM"])?.getType() === "sg",
        `singular girl: expected SYN.HEAD.AGR.NUM to be sg.`
    );
    assert(
        pluralGirl.getIn(["SYN", "HEAD", "AGR", "NUM"])?.getType() === "pl",
        `plural girl: expected SYN.HEAD.AGR.NUM to be pl.`
    );

    let rejectedMassPlural = false;
    try {
        applyPluralNounLexicalRule(water, grammar.types);
    } catch {
        rejectedMassPlural = true;
    }
    assert(rejectedMassPlural, `water: expected Plural Noun Lexical Rule to reject massn-lxm.`);
}
