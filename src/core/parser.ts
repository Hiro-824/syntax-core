export interface BinaryRules<T> {
    combine(left: T, right: T): { category: T; rule: string }[];
}

export type TerminalRules<T> = (terminal: string) => T[];

export type Node<T> = {
    mother: T;
    left?: Node<T>;
    right?: Node<T>;
    token?: string;
    rule: string;
}

export function parse<T>(
    words: string[],
    binaryRules: BinaryRules<T>,
    terminalRules: TerminalRules<T>
): Node<T>[] {
    const terminals = words.map(word =>
        terminalRules(word).map(cat => ({
            mother: cat,
            token: word,
            rule: "terminal",
        }))
    );

    return parseFromTerminalNodes(terminals, binaryRules);
}

export function parseFromTerminalNodes<T>(terminals: Node<T>[][], binaryRules: BinaryRules<T>): Node<T>[] {
    const length = terminals.length;
    if (length === 0) return [];

    const chart: Node<T>[][][] = Array.from({ length }, () =>
        Array.from({ length }, () => [])
    );

    for (let i = 0; i < length; i++) {
        chart[0][i] = terminals[i];
    }

    for (let spanLength = 2; spanLength <= length; spanLength++) {
        const spanIndex = spanLength - 1;

        for (let start = 0; start <= length - spanLength; start++) {
            const end = start + spanLength - 1;
            const cellNodes = chart[spanIndex][start];

            for (let split = start + 1; split <= end; split++) {
                const leftSpanIdx = (split - start) - 1;
                const rightSpanIdx = (end - split + 1) - 1;
                const leftNodes = chart[leftSpanIdx][start];
                const rightNodes = chart[rightSpanIdx][split];

                if (leftNodes.length === 0 || rightNodes.length === 0) continue;

                for (const leftNode of leftNodes) {

                    for (const rightNode of rightNodes) {
                        const results = binaryRules.combine(leftNode.mother, rightNode.mother);

                        if (results.length === 0) continue;

                        for (const result of results) {
                            cellNodes.push({
                                mother: result.category,
                                left: leftNode,
                                right: rightNode,
                                rule: result.rule,
                            });
                        }
                    }
                }
            }
        }
    }

    return chart[length - 1][0];
}
