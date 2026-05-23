# syntax-core

Core TypeScript library for parsing and grammar-related logic.

## Install from GitHub

Replace `OWNER` and `REPO` with the GitHub repository location:

```sh
npm install github:OWNER/REPO
```

For a private repository, SSH is usually easiest:

```sh
npm install git+ssh://git@github.com:OWNER/REPO.git
```

## Usage

```ts
import { HPSG, parse } from "syntax-core";

const hpsg = new HPSG();

// Build terminal rules from your LexemeInput data, then parse with:
// parse(words, hpsg.binaryRules, terminalRules);
```
