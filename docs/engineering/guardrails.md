# Engineering guardrails

## Done means verified
- Intent: no change is done until local feedback passed.
- Operator command(s): `make all`
- Enforcement: `.github/workflows/ci.yml` runs `make all`; `.pre-commit-config.yaml` runs the same command before commit.
- Failure signal: non-zero exit from lint, typecheck, or tests.
- Recovery: fix failure, then rerun `make all`.

## Test-first changes
- Intent: behavior changes should be shaped by deterministic tests.
- Operator command(s): `npm test -- <path-or-name>` while developing, then `make test`.
- Enforcement: CI requires full test suite.
- Failure signal: missing or failing tests for changed behavior.
- Recovery: add focused tests near the changed code, then implement.

## Architecture boundaries
- Intent: keep pure rules independent from Pi APIs, filesystem, and processes.
- Operator command(s): `make lint`
- Enforcement: review plus TypeScript compile checks.
- Failure signal: domain imports infrastructure, process, filesystem, or Pi runtime APIs.
- Recovery: move side effects to `src/infrastructure`, orchestration to `src/application`, pure logic to `src/domain`.

## One configuration namespace
- Intent: avoid competing settings formats.
- Operator command(s): `rg "pi-speak|readOutLoud" src README.md AGENTS.md`
- Enforcement: review; config tests in `src/infrastructure/read-out-loud-config.test.ts`.
- Failure signal: new ad-hoc config path or namespace.
- Recovery: use `pi-speak` for current config; keep `readOutLoud` only as legacy compatibility.

## CLI parity
- Intent: package bin, source CLI file, and tests must use the same command name.
- Operator command(s): `npm run pi-speak -- --help`, `npm test -- src/cli`
- Enforcement: CLI tests and package metadata review.
- Failure signal: stale command names, broken bin wrapper, or failed CLI tests.
- Recovery: update `package.json`, `bin/pi-speak.mjs`, `src/cli/pi-speak.ts`, and CLI tests together.

## No silent network fallback
- Intent: local-first speech behavior stays predictable.
- Operator command(s): `rg "fetch|http|https" src`
- Enforcement: review; network access belongs only to explicit voice install/list commands.
- Failure signal: runtime speech path reaches network unexpectedly.
- Recovery: remove fallback or make it an explicit CLI action with tests.

## Commit only after green checks
- Intent: keep history bisectable.
- Operator command(s): `make all && git status --short && git diff --cached --stat`
- Enforcement: pre-commit hook and CI.
- Failure signal: commit hook or CI fails.
- Recovery: fix, rerun `make all`, commit again without amending shared commits.
