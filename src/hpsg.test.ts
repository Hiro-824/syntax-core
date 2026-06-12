import { FeatureStructure, HPSG, parseFromString } from "./index.js";
import {
    applyBaseFormLexicalRule,
    applyNonThirdSingularVerbLexicalRule,
    applyPassiveLexicalRule,
    applyPastParticipleLexicalRule,
    applyPastTenseVerbLexicalRule,
    applyPresentParticipleLexicalRule,
    applyThirdSingularVerbLexicalRule,
} from "./grammars/hpsg/lexicon/lexical-rules/verbs.js";
import {
    applyPluralNounLexicalRule,
    applySingularNounLexicalRule,
} from "./grammars/hpsg/lexicon/lexical-rules/nouns.js";
import { applyConstantLexemeLexicalRule } from "./grammars/hpsg/lexicon/lexical-rules/constants.js";
import { buildCompleteLexeme } from "./grammars/hpsg/lexicon/lexeme-builder.js";
import { lexemeData } from "./examples/hpsg/lexeme-data.js";
import { createExampleHpsgTerminalRules } from "./examples/hpsg/terminal-rules.js";

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

function sameFeatureStructure(
    left: FeatureStructure | undefined,
    right: FeatureStructure | undefined
): boolean {
    return left !== undefined && right !== undefined && left.dereference() === right.dereference();
}

function runHpsgParseTests(): void {
    const grammar = new HPSG();
    const terminalRules = createExampleHpsgTerminalRules(grammar);

    const cases: ParseExpectation[] = [
        { sentence: "john sees mary", parses: 2 },
        { sentence: "john see mary", parses: 0 },
        { sentence: "girls sees mary", parses: 0 },
        { sentence: "a girl see mary", parses: 0 },
        { sentence: "a girl", parses: 1 },
        { sentence: "a girls", parses: 0 },
        { sentence: "i see myself", parses: 2 },
        { sentence: "i see yourself", parses: 0 },
        { sentence: "i see i", parses: 0 },
        { sentence: "i see me", parses: 0 },
        { sentence: "i see you", parses: 2 },
        { sentence: "you see yourself", parses: 2 },
        { sentence: "you see myself", parses: 0 },
        { sentence: "me see myself", parses: 0 },
        { sentence: "see mary", parses: 2 },
        { sentence: "the telescope", parses: 1, topRule: "indexed-right-head" },
        { sentence: "a water", parses: 0 },
    ];

    for (const testCase of cases) {
        const words = testCase.sentence.split(" ");
        const trees = parseFromString(words, grammar.binaryRules, terminalRules);

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
runDirectHpsgCombineTests();
runLexemeGeneratorTests();
runVerbLexemeConstraintTests();
runVerbLexicalRuleTests();
runConstantLexemeConstraintTests();
runConstantLexemeLexicalRuleTests();
runPronounRestrInputTests();
runAgrNormalizationTests();
runSynCatGapFeatureTests();
runIndexedHpsgCombineTests();
runGapPrincipleTests();
console.log("HPSG tests passed.");

function runLexemeGeneratorTests(): void {
    const grammar = new HPSG();
    const girlInput = lexemeData.find(input => input.type === "cntn-lxm" && input.singular === "girl");
    const waterInput = lexemeData.find(input => input.type === "massn-lxm" && input.form === "water");
    if (!girlInput) throw new Error(`expected girl lexeme data.`);
    if (!waterInput) throw new Error(`expected water lexeme data.`);

    const girl = buildCompleteLexeme(girlInput, grammar.types);
    const water = buildCompleteLexeme(waterInput, grammar.types);

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
    assert(
        sameFeatureStructure(
            girl.getIn(["SEM", "INDEX"]),
            girl.getIn(["SYN", "VAL", "SPR", "FIRST", "SEM", "INDEX"])
        ),
        `girl: expected SEM.INDEX and SPR.FIRST.SEM.INDEX to be shared.`
    );

    const singularGirl = applySingularNounLexicalRule(girl, grammar.types);
    const pluralGirl = applyPluralNounLexicalRule(girl, grammar.types);

    assert(singularGirl.getType() === "word", `singular girl: expected word.`);
    assert(pluralGirl.getType() === "word", `plural girl: expected word.`);
    assert(
        singularGirl.getIn(["SYN", "HEAD", "AGR"])?.getType() === "3sing",
        `singular girl: expected SYN.HEAD.AGR to be 3sing.`
    );
    assert(
        singularGirl.getIn(["SYN", "HEAD", "AGR", "NUM"])?.getType() === "sg",
        `singular girl: expected SYN.HEAD.AGR.NUM to be sg.`
    );
    assert(
        pluralGirl.getIn(["SYN", "HEAD", "AGR"])?.getType() === "plural",
        `plural girl: expected SYN.HEAD.AGR to be plural.`
    );
    assert(
        pluralGirl.getIn(["SYN", "HEAD", "AGR", "NUM"])?.getType() === "pl",
        `plural girl: expected SYN.HEAD.AGR.NUM to be pl.`
    );
    assert(
        sameFeatureStructure(
            singularGirl.getIn(["SEM", "INDEX"]),
            singularGirl.getIn(["SYN", "VAL", "SPR", "FIRST", "SEM", "INDEX"])
        ),
        `singular girl: expected SEM.INDEX and SPR.FIRST.SEM.INDEX to remain shared.`
    );

    let rejectedMassPlural = false;
    try {
        applyPluralNounLexicalRule(water, grammar.types);
    } catch {
        rejectedMassPlural = true;
    }
    assert(rejectedMassPlural, `water: expected Plural Noun Lexical Rule to reject massn-lxm.`);
}

function runSynCatGapFeatureTests(): void {
    const grammar = new HPSG();

    assert(
        grammar.types.getAppropriateType("syn-cat", "GAP") === "exp-list",
        `syn-cat: expected GAP appropriate type to be exp-list.`
    );
    assert(
        grammar.types.getAppropriateType("syn-cat", "STOP-GAP") === "exp-list",
        `syn-cat: expected STOP-GAP appropriate type to be exp-list.`
    );

    const synCat = FeatureStructure.fromJSON({
        type: "syn-cat",
        HEAD: "noun",
        VAL: {
            type: "val-cat",
            SPR: "exp-list-empty",
            COMPS: "exp-list-empty",
            MOD: "exp-list-empty",
        },
        GAP: "exp-list-empty",
        "STOP-GAP": {
            type: "exp-list-cons",
            FIRST: {
                type: "expression",
            },
            REST: "exp-list-empty",
        },
    }, grammar.types);

    assert(synCat.get("GAP")?.getType() === "exp-list-empty", `syn-cat: expected GAP list.`);
    assert(synCat.get("STOP-GAP")?.getType() === "exp-list-cons", `syn-cat: expected STOP-GAP list.`);

    let rejectedNonListGap = false;
    try {
        FeatureStructure.fromJSON({
            type: "syn-cat",
            GAP: "noun",
        }, grammar.types);
    } catch {
        rejectedNonListGap = true;
    }
    assert(rejectedNonListGap, `syn-cat: expected GAP to reject non exp-list values.`);
}

function runDirectHpsgCombineTests(): void {
    const grammar = new HPSG();
    const terminalRules = createExampleHpsgTerminalRules(grammar, [
        ...lexemeData,
        { type: "adv-lxm", form: "quickly" },
    ]);

    const john = getSingleTerminal(terminalRules, "john");
    const mary = getSingleTerminal(terminalRules, "mary");
    const sees = getSingleTerminal(terminalRules, "sees");
    const quickly = getSingleTerminal(terminalRules, "quickly");

    const seesMaryResults = grammar.combineHeadComplement(sees, mary);
    assert(seesMaryResults.length === 2, `sees mary: expected indexed head-complement keep/gap variants.`);
    assert(
        seesMaryResults.every(result => result.rule === "indexed-head-complement"),
        `sees mary: expected indexed head-complement.`
    );

    const reversedComplementResults = grammar.combineHeadComplement(mary, sees);
    assert(reversedComplementResults.length === 0, `mary sees: expected no direct head-complement result.`);

    const seesMary = seesMaryResults[0].category;
    const johnSeesMaryResults = grammar.combineHeadSpecifier(seesMary, john);
    assert(johnSeesMaryResults.length === 1, `john sees mary: expected one direct head-specifier result.`);
    assert(johnSeesMaryResults[0].rule === "indexed-head-specifier", `john sees mary: expected indexed head-specifier.`);

    const modifiedResults = grammar.combineHeadModifier(seesMary, quickly);
    assert(modifiedResults.length === 1, `sees mary quickly: expected one direct head-modifier result.`);
    assert(modifiedResults[0].rule === "indexed-head-modifier", `sees mary quickly: expected indexed head-modifier.`);

    const indexedModifiedResults = grammar.combineAdjacent(seesMary, quickly);
    assert(indexedModifiedResults.length === 1, `sees mary quickly: expected one indexed modifier result.`);
    assert(
        indexedModifiedResults[0].rule === "indexed-left-head",
        `sees mary quickly: expected indexed left-head modifier result.`
    );
    assert(
        indexedModifiedResults[0].category.getIn(["SYN", "VAL", "COMPS"])?.getType() === "exp-list-empty",
        `sees mary quickly: expected indexed modifier result to preserve empty COMPS.`
    );
    assert(
        indexedModifiedResults[0].category.getIn(["SYN", "VAL", "SPR"])?.getType() === "exp-list-cons",
        `sees mary quickly: expected indexed modifier result to preserve pending SPR.`
    );
}

function runIndexedHpsgCombineTests(): void {
    const grammar = new HPSG();
    const terminalRules = createExampleHpsgTerminalRules(grammar, [
        ...lexemeData,
        { type: "adv-lxm", form: "quickly" },
    ]);

    const i = getSingleTerminal(terminalRules, "i");
    const sendInput = lexemeData.find(input => input.type === "dtv-lxm" && input.base === "send");
    if (!sendInput || sendInput.type !== "dtv-lxm") throw new Error(`expected ditransitive send lexeme data.`);
    const send = grammar.buildVerbWords(sendInput).nonThirdSingular;
    const the = getSingleTerminal(terminalRules, "the");
    const telescope = getSingleTerminal(terminalRules, "telescope");
    const quickly = getSingleTerminal(terminalRules, "quickly");
    const theTelescopeResults = grammar.combineHeadSpecifier(telescope, the);
    assert(theTelescopeResults.length === 1, `the telescope: expected one NP result.`);
    const theTelescope = theTelescopeResults[0].category;

    const internalGapResults = grammar.combineIndexed({
        positions: [
            { role: "specifier", value: i },
            { role: "head", value: send },
            { role: "complement" },
            { role: "complement", value: theTelescope },
        ],
    });

    assert(internalGapResults.length === 1, `i send ___ the telescope: expected one indexed result.`);
    const internalGap = internalGapResults[0];
    assert(internalGap.getType() === "phrase", `indexed result: expected phrase.`);
    assert(internalGap.getIn(["SYN", "VAL", "SPR"])?.getType() === "exp-list-empty", `indexed result: expected SPR consumed.`);
    assert(internalGap.getIn(["SYN", "VAL", "COMPS"])?.getType() === "exp-list-empty", `indexed result: expected COMPS consumed.`);
    assert(expListLength(internalGap.getIn(["SYN", "GAP"])) === 1, `indexed result: expected one internal GAP.`);
    assert(
        internalGap.getIn(["SYN", "HEAD", "AGR"])?.getType() === "1sing",
        `indexed result: expected subject AGR unification to update head AGR.`
    );
    assert(
        sameFeatureStructure(
            internalGap.getIn(["SYN", "GAP", "FIRST"]),
            internalGap.getIn(["ARG-ST", "REST", "FIRST"])
        ),
        `indexed result: expected GAP object and ARG-ST object to be shared.`
    );
    assert(
        sameFeatureStructure(
            internalGap.getIn(["SYN", "GAP", "FIRST", "SEM", "INDEX"]),
            internalGap.getIn(["SEM", "RESTR", "FIRST", "ARG2"])
        ),
        `indexed result: expected GAP object index and verbal ARG2 to be shared.`
    );

    const edgeResults = grammar.combineIndexed({
        positions: [
            { role: "specifier" },
            { role: "head", value: send },
            { role: "complement" },
            { role: "complement" },
        ],
    });

    assert(edgeResults.length === 4, `send: expected four edge GAP/keep variants.`);
    const signatures = new Set(edgeResults.map(result =>
        [
            expListLength(result.getIn(["SYN", "VAL", "SPR"])),
            expListLength(result.getIn(["SYN", "VAL", "COMPS"])),
            expListLength(result.getIn(["SYN", "GAP"])),
        ].join("/")
    ));
    assert(signatures.has("1/2/0"), `send: expected variant keeping SPR and COMPS.`);
    assert(signatures.has("0/2/1"), `send: expected variant gapping SPR and keeping COMPS.`);
    assert(signatures.has("1/0/2"), `send: expected variant keeping SPR and gapping COMPS.`);
    assert(signatures.has("0/0/3"), `send: expected variant gapping SPR and COMPS.`);

    const indexedAdjacentResults = grammar.combineAdjacent(send, theTelescope);
    const binaryAdapterResults = grammar.binaryRules.combine(send, theTelescope);
    assert(
        indexedAdjacentResults.length === binaryAdapterResults.length,
        `indexed binary adapter: expected combineAdjacent and binaryRules to return the same number of results.`
    );
    assert(
        indexedAdjacentResults.length === 4,
        `indexed binary adapter: expected send + NP to produce left-edge/right-edge keep/gap variants.`
    );
    assert(
        binaryAdapterResults.every(result => result.rule === "indexed-left-head"),
        `indexed binary adapter: expected send + NP results to come from the left-head indexed pattern.`
    );

    const multiplyModifiedResults = grammar.combineIndexed({
        positions: [
            { role: "modifier", value: quickly },
            { role: "specifier", value: i },
            { role: "head", value: send },
            { role: "complement" },
            { role: "complement", value: theTelescope },
            { role: "modifier", value: quickly.deepCopy(new Map(), grammar.types) },
        ],
    });
    assert(
        multiplyModifiedResults.length === 1,
        `quickly i send ___ the telescope quickly: expected one role-based result.`
    );
    assert(
        expListLength(multiplyModifiedResults[0].getIn(["SYN", "GAP"])) === 1,
        `multiple modifiers: expected the skipped first complement to become an internal GAP.`
    );

    const nounModifierResults = grammar.combineIndexed({
        positions: [
            { role: "specifier", value: i },
            { role: "head", value: send },
            { role: "complement" },
            { role: "complement", value: theTelescope },
            { role: "modifier", value: theTelescope },
        ],
    });
    assert(
        nounModifierResults.length === 0,
        `noun modifier role: expected a noun with empty MOD to be rejected.`
    );
}

function runGapPrincipleTests(): void {
    const grammar = new HPSG();
    const terminalRules = createExampleHpsgTerminalRules(grammar, [
        ...lexemeData,
        { type: "adv-lxm", form: "quickly" },
    ]);

    const mary = getSingleTerminal(terminalRules, "mary");
    const sees = getSingleTerminal(terminalRules, "sees");
    const quickly = getSingleTerminal(terminalRules, "quickly");
    const seesMaryResults = grammar.combineHeadComplement(sees, mary);
    const headWithGap = seesMaryResults.find(result =>
        expListLength(result.category.getIn(["SYN", "GAP"])) === 1
    )?.category;
    if (!headWithGap) throw new Error(`expected sees mary variant with one subject GAP.`);

    const modifierWithGap = quickly.deepCopy(new Map(), grammar.types);
    const modifierGapItem = buildTestExpression("verb", grammar);
    modifierWithGap.get("SYN")?.add(
        "GAP",
        buildTestExpList([modifierGapItem], grammar),
        grammar.types
    );

    const summedResults = grammar.combineHeadModifier(headWithGap, modifierWithGap);
    assert(summedResults.length === 1, `GAP principle: expected modifier combination to succeed.`);
    assert(
        expListLength(summedResults[0].category.getIn(["SYN", "GAP"])) === 2,
        `GAP principle: expected mother GAP to be the sum of both child GAP lists.`
    );
    assert(
        summedResults[0].category.getIn(["SYN", "STOP-GAP"]) === undefined,
        `GAP principle: expected STOP-GAP not to be inherited.`
    );

    const stoppingHead = headWithGap.deepCopy(new Map(), grammar.types);
    stoppingHead.get("SYN")?.add(
        "STOP-GAP",
        buildTestExpList([
            buildTestExpression("verb", grammar),
            buildTestExpression("det", grammar),
        ], grammar),
        grammar.types
    );

    const stoppedResults = grammar.combineHeadModifier(stoppingHead, modifierWithGap);
    assert(stoppedResults.length === 1, `GAP principle: expected matching STOP-GAP to succeed.`);
    const stopped = stoppedResults[0].category;
    assert(
        expListLength(stopped.getIn(["SYN", "GAP"])) === 1,
        `GAP principle: expected STOP-GAP to remove one matching GAP.`
    );
    assert(
        stopped.getIn(["SYN", "GAP", "FIRST", "SYN", "HEAD"])?.getType() === "noun",
        `GAP principle: expected the first unifiable verb GAP to be removed, leaving the noun GAP.`
    );
    assert(
        stopped.getIn(["SYN", "STOP-GAP"]) === undefined,
        `GAP principle: expected neither consumed nor remaining STOP-GAP elements to be inherited.`
    );

    const failingHead = headWithGap.deepCopy(new Map(), grammar.types);
    failingHead.get("SYN")?.add(
        "STOP-GAP",
        buildTestExpList([buildTestExpression("adj", grammar)], grammar),
        grammar.types
    );
    assert(
        grammar.combineHeadModifier(failingHead, quickly).length === 0,
        `GAP principle: expected parsing to fail when STOP-GAP matches no child GAP.`
    );
}

function buildTestExpression(headType: "noun" | "verb" | "adj" | "det", grammar: HPSG): FeatureStructure {
    return FeatureStructure.fromJSON({
        type: "expression",
        SYN: {
            type: "syn-cat",
            HEAD: headType,
        },
    }, grammar.types);
}

function buildTestExpList(values: FeatureStructure[], grammar: HPSG): FeatureStructure {
    if (values.length === 0) return new FeatureStructure("exp-list-empty");

    const [first, ...rest] = values;
    const list = new FeatureStructure("exp-list-cons");
    list.add("FIRST", first!, grammar.types);
    list.add("REST", buildTestExpList(rest, grammar), grammar.types);
    return list;
}

function expListLength(list: FeatureStructure | undefined): number {
    if (!list) throw new Error(`expected exp-list to be present.`);
    let length = 0;
    let current = list.dereference();

    while (current.getType() === "exp-list-cons") {
        const rest = current.get("REST");
        if (!rest) throw new Error(`malformed exp-list-cons: missing REST.`);
        length++;
        current = rest.dereference();
    }

    assert(current.getType() === "exp-list-empty", `expected exp-list-empty, got ${current.getType()}.`);
    return length;
}

function getSingleTerminal(
    terminalRules: ReturnType<typeof createExampleHpsgTerminalRules>,
    terminal: string
): FeatureStructure {
    const categories = terminalRules(terminal);
    assert(categories.length === 1, `${terminal}: expected one terminal category, got ${categories.length}.`);
    return categories[0];
}

function runVerbLexemeConstraintTests(): void {
    const grammar = new HPSG();
    const see = buildCompleteLexeme({
        type: "stv-lxm",
        base: "see",
        thirdSingular: "sees",
        presentParticiple: "seeing",
        pastTense: "saw",
        pastParticiple: "seen",
        reln: "see",
    }, grammar.types);
    const sendDitransitive = buildCompleteLexeme({
        type: "dtv-lxm",
        base: "send",
        thirdSingular: "sends",
        presentParticiple: "sending",
        pastTense: "sent",
        pastParticiple: "sent",
        reln: "send",
    }, grammar.types);
    const sendPrepositional = buildCompleteLexeme({
        type: "ptv-lxm",
        base: "send",
        thirdSingular: "sends",
        presentParticiple: "sending",
        pastTense: "sent",
        pastParticiple: "sent",
        reln: "send",
        prepositionForm: "to-form",
    }, grammar.types);

    assert(see.getType() === "stv-lxm", `see: expected stv-lxm, got ${see.getType()}.`);
    assert(
        see.getIn(["SYN", "HEAD"])?.getType() === "verb",
        `see: expected SYN.HEAD to be verb.`
    );
    assert(
        see.getIn(["SYN", "HEAD", "AUX"])?.getType() === "-",
        `see: expected SYN.HEAD.AUX to be -.`
    );
    assert(
        sameFeatureStructure(
            see.getIn(["SEM", "INDEX"]),
            see.getIn(["SEM", "RESTR", "FIRST", "SIT"])
        ),
        `see: expected SEM.INDEX and RESTR.FIRST.SIT to be shared.`
    );
    assert(
        sameFeatureStructure(
            see.getIn(["ARG-ST", "FIRST", "SEM", "INDEX"]),
            see.getIn(["SEM", "RESTR", "FIRST", "ARG1"])
        ),
        `see: expected subject INDEX and ARG1 to be shared.`
    );
    assert(
        sameFeatureStructure(
            see.getIn(["ARG-ST", "REST", "FIRST", "SEM", "INDEX"]),
            see.getIn(["SEM", "RESTR", "FIRST", "ARG2"])
        ),
        `see: expected object INDEX and ARG2 to be shared.`
    );

    assert(
        sameFeatureStructure(
            sendDitransitive.getIn(["ARG-ST", "REST", "FIRST", "SEM", "INDEX"]),
            sendDitransitive.getIn(["SEM", "RESTR", "FIRST", "ARG2"])
        ),
        `dtv send: expected second ARG-ST element and ARG2 to be shared.`
    );
    assert(
        sameFeatureStructure(
            sendDitransitive.getIn(["ARG-ST", "REST", "REST", "FIRST", "SEM", "INDEX"]),
            sendDitransitive.getIn(["SEM", "RESTR", "FIRST", "ARG3"])
        ),
        `dtv send: expected third ARG-ST element and ARG3 to be shared.`
    );
    assert(
        sameFeatureStructure(
            sendPrepositional.getIn(["ARG-ST", "REST", "FIRST", "SEM", "INDEX"]),
            sendPrepositional.getIn(["SEM", "RESTR", "FIRST", "ARG3"])
        ),
        `ptv send: expected second ARG-ST element and ARG3 to be shared.`
    );
    assert(
        sameFeatureStructure(
            sendPrepositional.getIn(["ARG-ST", "REST", "REST", "FIRST", "SEM", "INDEX"]),
            sendPrepositional.getIn(["SEM", "RESTR", "FIRST", "ARG2"])
        ),
        `ptv send: expected third ARG-ST element and ARG2 to be shared.`
    );
    assert(
        sendPrepositional.getIn(["ARG-ST", "REST", "REST", "FIRST", "SYN", "HEAD", "FORM"])?.getType() === "to-form",
        `ptv send: expected preposition FORM to-form.`
    );
}

function runConstantLexemeLexicalRuleTests(): void {
    const grammar = new HPSG();
    const inPrep = buildCompleteLexeme({ type: "predp-lxm", form: "in", reln: "in", mod: "nom" }, grammar.types);
    const inWord = applyConstantLexemeLexicalRule(inPrep, grammar.types);

    assert(inWord.getType() === "word", `in word: expected word.`);
    assert(inWord.getIn(["SYN", "HEAD"])?.getType() === "prep", `in word: expected HEAD prep.`);
    assert(
        sameFeatureStructure(inWord.getIn(["SYN", "VAL", "SPR", "FIRST"]), inWord.getIn(["ARG-ST", "FIRST"])),
        `in word: expected SPR and ARG-ST first to remain shared.`
    );
    assert(
        sameFeatureStructure(inWord.getIn(["SYN", "VAL", "COMPS", "FIRST"]), inWord.getIn(["ARG-ST", "REST", "FIRST"])),
        `in word: expected COMPS and ARG-ST second to remain shared.`
    );

    let rejectedInflLexeme = false;
    try {
        const see = buildCompleteLexeme({
            type: "stv-lxm",
            base: "see",
            thirdSingular: "sees",
            presentParticiple: "seeing",
            pastTense: "saw",
            pastParticiple: "seen",
            reln: "see",
        }, grammar.types);
        applyConstantLexemeLexicalRule(see, grammar.types);
    } catch {
        rejectedInflLexeme = true;
    }
    assert(rejectedInflLexeme, `Constant Lexeme Lexical Rule should reject infl-lxm descendants.`);
}

function runConstantLexemeConstraintTests(): void {
    const grammar = new HPSG();
    const kim = buildCompleteLexeme({ type: "pn-lxm", form: "kim", reln: "named Kim" }, grammar.types);
    const she = buildCompleteLexeme({ type: "pron-lxm", form: "she" }, grammar.types);
    const big = buildCompleteLexeme({ type: "adj-lxm", form: "big", reln: "big" }, grammar.types);
    const quickly = buildCompleteLexeme({ type: "adv-lxm", form: "quickly" }, grammar.types);
    const the = buildCompleteLexeme({ type: "det-lxm", form: "the" }, grammar.types);
    const of = buildCompleteLexeme({ type: "argmkp-lxm", form: "of" }, grammar.types);
    const inPrep = buildCompleteLexeme({ type: "predp-lxm", form: "in", reln: "in", mod: "nom" }, grammar.types);

    assert(kim.getIn(["SYN", "HEAD"])?.getType() === "noun", `kim: expected HEAD noun.`);
    assert(kim.getIn(["SYN", "HEAD", "AGR", "PER"])?.getType() === "3rd", `kim: expected PER 3rd.`);
    assert(kim.getIn(["SYN", "HEAD", "AGR", "NUM"])?.getType() === "sg", `kim: expected default NUM sg.`);
    assert(kim.getIn(["SEM", "MODE"])?.getType() === "ref", `kim: expected default MODE ref.`);
    assert(kim.getIn(["ARG-ST"])?.getType() === "exp-list-empty", `kim: expected empty ARG-ST.`);

    assert(she.getIn(["SYN", "HEAD"])?.getType() === "noun", `she: expected HEAD noun.`);
    assert(she.getIn(["SEM", "MODE"])?.getType() === "ref", `she: expected default MODE ref.`);
    assert(she.getIn(["ARG-ST"])?.getType() === "exp-list-empty", `she: expected empty ARG-ST.`);

    assert(big.getIn(["SYN", "HEAD"])?.getType() === "adj", `big: expected HEAD adj.`);
    assert(big.getIn(["SEM", "MODE"])?.getType() === "prop", `big: expected MODE prop.`);
    assert(
        sameFeatureStructure(
            big.getIn(["ARG-ST", "FIRST"]),
            big.getIn(["SYN", "VAL", "SPR", "FIRST"])
        ),
        `big: expected ARG-ST first and SPR first to be shared.`
    );
    assert(big.getIn(["SYN", "VAL", "MOD", "FIRST", "SYN", "HEAD"])?.getType() === "noun", `big: expected noun modifier target.`);

    assert(quickly.getIn(["SYN", "HEAD"])?.getType() === "adv", `quickly: expected HEAD adv.`);
    assert(quickly.getIn(["SYN", "VAL", "MOD", "FIRST", "SYN", "HEAD"])?.getType() === "verb", `quickly: expected verb modifier target.`);
    assert(quickly.getIn(["SEM", "MODE"])?.getType() === "none", `quickly: expected MODE none.`);

    assert(the.getIn(["SYN", "HEAD"])?.getType() === "det", `the: expected HEAD det.`);
    assert(the.getIn(["SYN", "VAL", "SPR"])?.getType() === "exp-list-empty", `the: expected default SPR empty.`);
    assert(the.getIn(["SYN", "VAL", "COMPS"])?.getType() === "exp-list-empty", `the: expected COMPS empty.`);
    assert(the.getIn(["SEM", "MODE"])?.getType() === "none", `the: expected MODE none.`);

    assert(of.getIn(["SYN", "HEAD"])?.getType() === "prep", `of: expected HEAD prep.`);
    assert(of.getIn(["SYN", "VAL", "SPR"])?.getType() === "exp-list-empty", `of: expected SPR empty.`);
    assert(of.getIn(["SEM", "RESTR"])?.getType() === "pred-list-empty", `of: expected empty RESTR.`);
    assert(
        sameFeatureStructure(of.getIn(["SEM", "INDEX"]), of.getIn(["ARG-ST", "FIRST", "SEM", "INDEX"])),
        `of: expected SEM.INDEX and object INDEX to be shared.`
    );
    assert(
        sameFeatureStructure(of.getIn(["SEM", "MODE"]), of.getIn(["ARG-ST", "FIRST", "SEM", "MODE"])),
        `of: expected SEM.MODE and object MODE to be shared.`
    );

    assert(inPrep.getIn(["SYN", "HEAD"])?.getType() === "prep", `in: expected HEAD prep.`);
    assert(inPrep.getIn(["SEM", "MODE"])?.getType() === "prop", `in: expected MODE prop.`);
    assert(inPrep.getIn(["SEM", "RESTR", "FIRST", "RELN"])?.getType() === "in", `in: expected RELN in.`);
    assert(
        sameFeatureStructure(inPrep.getIn(["SYN", "VAL", "SPR", "FIRST"]), inPrep.getIn(["ARG-ST", "FIRST"])),
        `in: expected SPR and ARG-ST first to be shared.`
    );
    assert(
        sameFeatureStructure(inPrep.getIn(["SYN", "VAL", "COMPS", "FIRST"]), inPrep.getIn(["ARG-ST", "REST", "FIRST"])),
        `in: expected COMPS and ARG-ST second to be shared.`
    );
}

function runPronounRestrInputTests(): void {
    const grammar = new HPSG();
    const we = grammar.buildLexeme({
        type: "pron-lxm",
        form: "we",
        case: "nom",
        agr: "plural",
        per: "1st",
        num: "pl",
        index: "group",
        restr: [
            { reln: "group", arg1: "group" },
            { reln: "speaker", arg1: "speaker" },
            { reln: "member", arg1: "group", arg2: "speaker" },
        ],
    });

    assert(we.getIn(["SEM", "RESTR"])?.getType() === "pred-list-cons", `we: expected non-empty RESTR.`);
    assert(we.getIn(["SEM", "RESTR", "FIRST", "RELN"])?.getType() === "group", `we: expected first RELN group.`);
    assert(we.getIn(["SEM", "RESTR", "REST", "FIRST", "RELN"])?.getType() === "speaker", `we: expected second RELN speaker.`);
    assert(we.getIn(["SEM", "RESTR", "REST", "REST", "FIRST", "RELN"])?.getType() === "member", `we: expected third RELN member.`);
    assert(
        sameFeatureStructure(
            we.getIn(["SEM", "INDEX"]),
            we.getIn(["SEM", "RESTR", "FIRST", "ARG1"])
        ),
        `we: expected group predicate ARG1 to share SEM.INDEX.`
    );
    assert(
        sameFeatureStructure(
            we.getIn(["SEM", "RESTR", "FIRST", "ARG1"]),
            we.getIn(["SEM", "RESTR", "REST", "REST", "FIRST", "ARG1"])
        ),
        `we: expected member ARG1 to share group index.`
    );
    assert(
        sameFeatureStructure(
            we.getIn(["SEM", "RESTR", "REST", "FIRST", "ARG1"]),
            we.getIn(["SEM", "RESTR", "REST", "REST", "FIRST", "ARG2"])
        ),
        `we: expected member ARG2 to share speaker index.`
    );
}

function runAgrNormalizationTests(): void {
    const grammar = new HPSG();

    const secondSingular = grammar.buildLexeme({
        type: "pron-lxm",
        form: "thyself",
        per: "2nd",
        num: "sg",
        mode: "ana",
    });

    assert(
        secondSingular.getIn(["SYN", "HEAD", "AGR"])?.getType() === "2sing",
        `thyself: expected PER=2nd and NUM=sg to normalize AGR to 2sing.`
    );
    assert(
        secondSingular.getIn(["SYN", "HEAD", "AGR", "PER"])?.getType() === "2nd",
        `thyself: expected AGR.PER 2nd.`
    );
    assert(
        secondSingular.getIn(["SYN", "HEAD", "AGR", "NUM"])?.getType() === "sg",
        `thyself: expected AGR.NUM sg.`
    );

    const thirdPlural = grammar.buildLexeme({
        type: "pron-lxm",
        form: "they",
        per: "3rd",
        num: "pl",
    });

    assert(
        thirdPlural.getIn(["SYN", "HEAD", "AGR"])?.getType() === "plural",
        `they: expected NUM=pl to normalize AGR to plural.`
    );
    assert(
        thirdPlural.getIn(["SYN", "HEAD", "AGR", "PER"])?.getType() === "3rd",
        `they: expected AGR.PER 3rd.`
    );

    const explicitBroad = grammar.buildLexeme({
        type: "pron-lxm",
        form: "you",
        agr: "agr-cat",
        per: "2nd",
    });

    assert(
        explicitBroad.getIn(["SYN", "HEAD", "AGR"])?.getType() === "agr-cat",
        `you: expected underspecified AGR to remain agr-cat without NUM.`
    );

    let rejectedInconsistentAgr = false;
    try {
        grammar.buildLexeme({
            type: "pron-lxm",
            form: "bad",
            agr: "3sing",
            per: "2nd",
            num: "sg",
        });
    } catch {
        rejectedInconsistentAgr = true;
    }
    assert(rejectedInconsistentAgr, `bad: expected incompatible AGR and PER to be rejected.`);
}

function runVerbLexicalRuleTests(): void {
    const grammar = new HPSG();
    const see = buildCompleteLexeme({
        type: "stv-lxm",
        base: "see",
        thirdSingular: "sees",
        presentParticiple: "seeing",
        pastTense: "saw",
        pastParticiple: "seen",
        reln: "see",
    }, grammar.types);

    const thirdSingular = applyThirdSingularVerbLexicalRule(see, grammar.types);
    const nonThirdSingular = applyNonThirdSingularVerbLexicalRule(see, grammar.types);
    const pastTense = applyPastTenseVerbLexicalRule(see, grammar.types);
    const baseForm = applyBaseFormLexicalRule(see, grammar.types);
    const presentParticiple = applyPresentParticipleLexicalRule(see, grammar.types);
    const pastParticiple = applyPastParticipleLexicalRule(see, grammar.types);
    const passive = applyPassiveLexicalRule(see, grammar.types);

    assert(thirdSingular.getType() === "word", `third singular see: expected word.`);
    assert(
        thirdSingular.getIn(["SYN", "HEAD", "FORM"])?.getType() === "fin",
        `third singular see: expected FORM fin.`
    );
    assert(
        thirdSingular.getIn(["SYN", "HEAD", "AGR"])?.getType() === "3sing",
        `third singular see: expected AGR 3sing.`
    );
    assert(
        thirdSingular.getIn(["SYN", "HEAD", "AGR", "PER"])?.getType() === "3rd",
        `third singular see: expected AGR.PER 3rd.`
    );
    assert(
        thirdSingular.getIn(["SYN", "HEAD", "AGR", "NUM"])?.getType() === "sg",
        `third singular see: expected AGR.NUM sg.`
    );
    assert(
        thirdSingular.getIn(["ARG-ST", "FIRST", "SYN", "HEAD", "CASE"])?.getType() === "nom",
        `third singular see: expected subject CASE nom.`
    );
    assert(
        thirdSingular.getIn(["ARG-ST", "REST", "FIRST", "SYN", "HEAD", "CASE"])?.getType() === "acc",
        `third singular see: expected object CASE acc.`
    );
    assert(
        nonThirdSingular.getIn(["SYN", "HEAD", "AGR"])?.getType() === "non-3sing",
        `non third singular see: expected AGR non-3sing.`
    );
    assert(
        pastTense.getIn(["SYN", "HEAD", "FORM"])?.getType() === "fin",
        `past tense see: expected FORM fin.`
    );
    assert(
        pastTense.getIn(["SYN", "HEAD", "AGR"])?.getType() === "agr-cat",
        `past tense see: expected AGR to remain general agr-cat.`
    );
    assert(
        baseForm.getIn(["SYN", "HEAD", "FORM"])?.getType() === "base",
        `base form see: expected FORM base.`
    );
    assert(
        baseForm.getIn(["ARG-ST", "FIRST", "SYN", "HEAD", "CASE"]) === undefined,
        `base form see: expected subject CASE to be unspecified.`
    );
    assert(presentParticiple.getType() === "part-lxm", `present participle see: expected part-lxm.`);
    assert(
        presentParticiple.getIn(["SYN", "HEAD", "FORM"])?.getType() === "prp",
        `present participle see: expected FORM prp.`
    );
    assert(
        sameFeatureStructure(
            presentParticiple.getIn(["ARG-ST", "FIRST"]),
            presentParticiple.getIn(["SYN", "VAL", "SPR", "FIRST"])
        ),
        `present participle see: expected ARG-ST first element and SPR first element to be shared.`
    );
    assert(
        sameFeatureStructure(
            presentParticiple.getIn(["ARG-ST", "REST", "FIRST"]),
            presentParticiple.getIn(["SYN", "VAL", "COMPS", "FIRST"])
        ),
        `present participle see: expected ARG-ST second element and COMPS first element to be shared.`
    );
    assert(
        presentParticiple.getIn(["SYN", "VAL", "COMPS", "REST"])?.getType() === "exp-list-empty",
        `present participle see: expected COMPS to contain one element.`
    );
    assert(pastParticiple.getType() === "part-lxm", `past participle see: expected part-lxm.`);
    assert(
        pastParticiple.getIn(["SYN", "HEAD", "FORM"])?.getType() === "psp",
        `past participle see: expected FORM psp.`
    );
    assert(
        sameFeatureStructure(
            pastParticiple.getIn(["ARG-ST", "FIRST"]),
            pastParticiple.getIn(["SYN", "VAL", "SPR", "FIRST"])
        ),
        `past participle see: expected ARG-ST first element and SPR first element to be shared.`
    );
    assert(
        sameFeatureStructure(
            pastParticiple.getIn(["ARG-ST", "REST", "FIRST"]),
            pastParticiple.getIn(["SYN", "VAL", "COMPS", "FIRST"])
        ),
        `past participle see: expected ARG-ST second element and COMPS first element to be shared.`
    );
    assert(
        pastParticiple.getIn(["SYN", "VAL", "COMPS", "REST"])?.getType() === "exp-list-empty",
        `past participle see: expected COMPS to contain one element.`
    );
    assert(passive.getType() === "part-lxm", `passive see: expected part-lxm.`);
    assert(
        passive.getIn(["SYN", "HEAD", "FORM"])?.getType() === "pass",
        `passive see: expected FORM pass.`
    );
    assert(
        expListLength(passive.get("ARG-ST")) === 1,
        `passive see: expected the first ARG-ST element to be removed.`
    );
    assert(
        sameFeatureStructure(
            passive.getIn(["ARG-ST", "FIRST"]),
            passive.getIn(["SYN", "VAL", "SPR", "FIRST"])
        ),
        `passive see: expected reduced ARG-ST first element and SPR first element to be shared.`
    );
    assert(
        passive.getIn(["SYN", "VAL", "COMPS"])?.getType() === "exp-list-empty",
        `passive see: expected empty COMPS.`
    );

    let rejectedIntransitive = false;
    try {
        const walk = buildCompleteLexeme({
            type: "siv-lxm",
            base: "walk",
            thirdSingular: "walks",
            presentParticiple: "walking",
            pastTense: "walked",
            pastParticiple: "walked",
            reln: "walk",
        }, grammar.types);
        applyPassiveLexicalRule(walk, grammar.types);
    } catch {
        rejectedIntransitive = true;
    }
    assert(rejectedIntransitive, `Passive Lexical Rule should reject non-tv-lxm inputs.`);

    const generatedWords = grammar.buildVerbWords({
        type: "stv-lxm",
        base: "see",
        thirdSingular: "sees",
        presentParticiple: "seeing",
        pastTense: "saw",
        pastParticiple: "seen",
        reln: "see",
    });
    assert(
        generatedWords.passive?.getIn(["SYN", "HEAD", "FORM"])?.getType() === "pass",
        `buildVerbWords: expected a passive form for tv-lxm.`
    );

    const terminalRules = createExampleHpsgTerminalRules(grammar, [{
        type: "stv-lxm",
        base: "see",
        thirdSingular: "sees",
        presentParticiple: "seeing",
        pastTense: "saw",
        pastParticiple: "seen",
        reln: "see",
    }]);
    const seenCategories = terminalRules("seen");
    assert(
        seenCategories.some(category => category.getIn(["SYN", "HEAD", "FORM"])?.getType() === "pass"),
        `seen: expected terminal rules to include a passive category.`
    );
    assert(
        sameFeatureStructure(
            thirdSingular.getIn(["ARG-ST", "FIRST"]),
            thirdSingular.getIn(["SYN", "VAL", "SPR", "FIRST"])
        ),
        `third singular see: expected ARG-ST first element and SPR first element to be shared.`
    );
    assert(
        sameFeatureStructure(
            thirdSingular.getIn(["ARG-ST", "REST", "FIRST"]),
            thirdSingular.getIn(["SYN", "VAL", "COMPS", "FIRST"])
        ),
        `third singular see: expected ARG-ST second element and COMPS first element to be shared.`
    );
    assert(
        thirdSingular.getIn(["SYN", "VAL", "COMPS", "REST"])?.getType() === "exp-list-empty",
        `third singular see: expected COMPS to contain one element.`
    );
}
