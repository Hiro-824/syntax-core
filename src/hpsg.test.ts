import { HPSG, parse } from "./index.js";
import {
    applyPluralNounLexicalRule,
    applySingularNounLexicalRule,
    applyBaseFormLexicalRule,
    applyNonThirdSingularVerbLexicalRule,
    applyPastParticipleLexicalRule,
    applyPastTenseVerbLexicalRule,
    applyPresentParticipleLexicalRule,
    applyThirdSingularVerbLexicalRule,
    applyConstantLexemeLexicalRule,
    buildCompleteLexeme,
} from "./grammars/hpsg/lexical-entry-generator.js";
import { lexemeData } from "./examples/hpsg/lexeme-data.js";
import { lexiconData } from "./examples/hpsg/lexicon-data.js";
import { FeatureStructure } from "./features/features.js";

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
    const lexicon = grammar.createLexicon(lexiconData);

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
        const trees = parse(words, grammar.binaryRules, lexicon);

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
runVerbLexemeConstraintTests();
runVerbLexicalRuleTests();
runConstantLexemeConstraintTests();
runConstantLexemeLexicalRuleTests();
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
        singularGirl.getIn(["SYN", "HEAD", "AGR", "NUM"])?.getType() === "sg",
        `singular girl: expected SYN.HEAD.AGR.NUM to be sg.`
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

function runVerbLexemeConstraintTests(): void {
    const grammar = new HPSG();
    const see = buildCompleteLexeme({
        type: "stv-lxm",
        base: "see",
        thirdSingular: "sees",
        presentParticiple: "seeing",
        pastParticiple: "seen",
        reln: "see",
    }, grammar.types);
    const sendDitransitive = buildCompleteLexeme({
        type: "dtv-lxm",
        base: "send",
        thirdSingular: "sends",
        presentParticiple: "sending",
        pastParticiple: "sent",
        reln: "send",
    }, grammar.types);
    const sendPrepositional = buildCompleteLexeme({
        type: "ptv-lxm",
        base: "send",
        thirdSingular: "sends",
        presentParticiple: "sending",
        pastParticiple: "sent",
        reln: "send",
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
}

function runConstantLexemeLexicalRuleTests(): void {
    const grammar = new HPSG();
    const inPrep = buildCompleteLexeme({ type: "predp-lxm", form: "in", reln: "in" }, grammar.types);
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
    const inPrep = buildCompleteLexeme({ type: "predp-lxm", form: "in", reln: "in" }, grammar.types);

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

function runVerbLexicalRuleTests(): void {
    const grammar = new HPSG();
    const see = buildCompleteLexeme({
        type: "stv-lxm",
        base: "see",
        thirdSingular: "sees",
        presentParticiple: "seeing",
        pastParticiple: "seen",
        reln: "see",
    }, grammar.types);

    const thirdSingular = applyThirdSingularVerbLexicalRule(see, grammar.types);
    const nonThirdSingular = applyNonThirdSingularVerbLexicalRule(see, grammar.types);
    const pastTense = applyPastTenseVerbLexicalRule(see, grammar.types);
    const baseForm = applyBaseFormLexicalRule(see, grammar.types);
    const presentParticiple = applyPresentParticipleLexicalRule(see, grammar.types);
    const pastParticiple = applyPastParticipleLexicalRule(see, grammar.types);

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
        thirdSingular.getIn(["ARG-ST", "FIRST", "SYN", "HEAD", "CASE"])?.getType() === "nom",
        `third singular see: expected subject CASE nom.`
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
    assert(pastParticiple.getType() === "part-lxm", `past participle see: expected part-lxm.`);
    assert(
        pastParticiple.getIn(["SYN", "HEAD", "FORM"])?.getType() === "psp",
        `past participle see: expected FORM psp.`
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
