# Reveal Sequence Implementation Plan

This plan turns the proof of concept into the architecture defined in
[`DESIGN.md`](./DESIGN.md). Work is split by dependency order so later DOM and packaging work is
built on tested reconciliation and scheduling behavior.

## Phase 1: Core correctness

- [x] Introduce source-offset text units with stable generation-based identifiers.
- [x] Implement initial, append, unchanged, rewrite, and reset reconciliation paths.
- [x] Preserve the identity of a final word when a later chunk extends it.
- [x] Implement one persistent deadline-aware scheduler per reveal root.
- [x] Integrate the scheduler with `RevealText` and `RevealGroup`.
- [x] Keep React development StrictMode behavior deterministic.
- [x] Add reconciliation, scheduler, and integration tests.
- [x] Verify the real animation in the browser.

## Phase 2: Bounded DOM lifecycle

- [x] Add the `streaming` lifecycle contract.
- [x] Track pending, animating, and settled units.
- [x] Compact settled text into a plain-text prefix.
- [x] Enforce `maxAnimatedItems`.
- [x] Defer final compaction while the user owns a selection.
- [x] Guarantee a clean DOM after stream completion.

## Phase 3: Platform validation

- [x] Match server and first-client markup.
- [ ] Add a dedicated React 18 compatibility fixture (post-1.0 validation).
- [x] Add sentence- and completion-based announcement modes.
- [ ] Add Chromium, Firefox, and WebKit browser checks (post-1.0 validation).
- [ ] Add high-rate stream and long-message benchmark reporting (post-1.0 validation).

## Phase 4: Publishable package

- [x] Produce ESM, CommonJS, source map, and declaration outputs.
- [x] Enforce the 5.1 KiB gzip budget.
- [x] Add package-content checks.
- [ ] Enable npm provenance for a CI-based release.
- [ ] Publish the public playground after the 1.0.0 release.
- [x] Prepare the 1.0.0 public release contract and package metadata.
