# Landing checklist

Before commit:

- [ ] Tests were added or updated for behavior changes.
- [ ] Architecture boundary is preserved:
  - `src/domain` is pure.
  - `src/application` depends on ports.
  - `src/infrastructure` owns side effects.
- [ ] Config uses `pi-speak`; `readOutLoud` appears only for legacy compatibility.
- [ ] CLI changes update package metadata, bin wrapper, source, and tests together.
- [ ] `make all` passes.
- [ ] `git status --short` contains only intentional files.
- [ ] Commit message is semantic, for example `feat: add voice profile command`.
