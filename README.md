# syntax-core

Core TypeScript library for parsing and grammar-related logic.

## Install from GitHub

```sh
npm install github:Hiro-824/syntax-core
```

## Usage

```ts
import { HPSG, parse } from "syntax-core";

const hpsg = new HPSG();

// Build terminal rules from your LexemeInput data, then parse with:
// parse(words, hpsg.binaryRules, terminalRules);
```
