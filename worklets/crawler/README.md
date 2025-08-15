# Worklet Spider

## How to use

1. Install with pnpm, the version of Node.js should be >=20.x.x

```bash
cd worklets/crawler
pnpm install
```

2. Check config.json or cp config.json.example into config.json

```
cd configs/browser/
check config.json
```

or
```
cd configs/browser/
cp config.json.example config.json
```

3. Install dependencies with pnpm in browser folder.
```bash
cd wyse-browser/browser
pnpm install
```

4. Build it and run:

```bash
cd worklets/crawler
pnpm build
pnpm cmd
```
