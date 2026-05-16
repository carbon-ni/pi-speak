# Commands

## Install
```bash
npm install
```

## Develop
```bash
npm test -- --watch
npm test -- src/domain/command-parser.test.ts
npm run typecheck
```

## Quality gate
```bash
make all
```

Equivalent npm commands:
```bash
npm run lint
npm test
```

## CLI smoke test
```bash
npm run pi-speak -- --help
npm run pi-speak -- init
```

## Git hooks
```bash
pre-commit install
pre-commit run --all-files
```
If `pre-commit` is missing:
```bash
python3 -m pip install pre-commit
```

## Landing
```bash
make all
git status --short
git add <files>
git commit -m "<type>: <summary>"
```
