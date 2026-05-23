import { HPSG, HPSGLexicon, parse } from "./index.js";

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
console.log("HPSG tests passed.");
