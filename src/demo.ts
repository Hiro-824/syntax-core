import { CFG, CFGLexicon, HPSG, parse, Node } from "./index.js";

function formatTree<T>(
    node: Node<T>,
    motherToString: (mother: T) => string,
    depth: number = 0
): string {
    const indent = "  ".repeat(depth);
    const label = motherToString(node.mother);

    if (node.token) {
        return `${indent}${label} -> "${node.token}"`;
    }

    const lines = [`${indent}${label} (${node.rule})`];
    if (node.left) lines.push(formatTree(node.left, motherToString, depth + 1));
    if (node.right) lines.push(formatTree(node.right, motherToString, depth + 1));
    return lines.join("\n");
}

function runCFGDemo(): void {
    const sentence = ["john", "sees", "mary"];
    const grammar = new CFG();
    const lexicon = new CFGLexicon();
    const trees = parse(sentence, grammar, lexicon);

    console.log(`\n[CFG] ${sentence.join(" ")}`);
    console.log(`parses: ${trees.length}`);
    trees.forEach((tree, i) => {
        console.log(`\nparse #${i + 1}`);
        console.log(formatTree(tree, mother => mother));
    });
}

function runHPSGDemo(): void {
    const sentence = ["you", "see", "yourself"];
    const grammar = new HPSG();
    const trees = parse(sentence, grammar, grammar);

    console.log(`\n[HPSG] ${sentence.join(" ")}`);
    console.log(`parses: ${trees.length}`);

    trees.forEach((tree, i) => {
        console.log(`\nparse #${i + 1}`);
        console.log(formatTree(tree, mother => mother.getType()));
    });
}

runCFGDemo();
runHPSGDemo();
