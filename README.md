# syntax-core

Core TypeScript library for parsing and grammar-related logic.

## Install from GitHub

```sh
npm install github:Hiro-824/syntax-core
```

## Usage

```ts
import { HPSG, parseFromString } from "syntax-core";

const hpsg = new HPSG();

// Build terminal rules from your LexemeInput data, then parse with:
// parseFromString(words, hpsg.binaryRules, terminalRules);
```

## Indexed HPSG input

`HPSG.combineIndexed()` receives an ordered list of structural positions. Each
position has an explicit role:

- `specifier`: an SPR slot, in valence-list order
- `head`: the single head position
- `complement`: a COMPS slot, in valence-list order
- `modifier`: an attached modifier on either side of the head

The array order is the surface or block order. Specifiers precede the head,
complements follow it, and modifiers may appear on either side. Omitting
`value` preserves an empty specifier or complement position; head and modifier
positions must be filled. Empty positions before a later filled position become
internal GAPs. Explicitly unfilled edge positions continue to produce both the
keep-in-valence and move-to-GAP variants. Valence slots omitted from the array
remain in SPR or COMPS.

```ts
const results = hpsg.combineIndexed({
    positions: [
        { role: "specifier" },
        { role: "head", value: give },
        { role: "complement" },
        { role: "complement", value: mary },
        { role: "modifier", value: quickly },
    ],
});
```

Multiple left or right modifiers are represented by multiple `modifier`
positions in their surface order. The CYK-facing `binaryRules` API remains
unchanged; its binary adapter constructs these role-based inputs internally.
