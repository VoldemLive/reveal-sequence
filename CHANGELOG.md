# Changelog

All notable changes to this project are documented here.

## 1.0.0 - 2026-09-12

### Added

- Append-aware text reveal by grapheme, word, sentence, and paragraph.
- Keyed React child sequencing through `RevealGroup`.
- Seven built-in effects plus custom Web Animations API keyframes.
- Mount, in-view, and controlled triggers.
- Optional sentence and final-value announcements.

### Reliability

- A deadline-aware scheduler controlled by `interval` and `maxLag`.
- Configurable `maxAnimatedItems` to bound text wrappers during bursts.
- Selection-safe compaction back to ordinary text after stream completion.
- SSR-readable output and reduced-motion support.

### Packaging

- ESM, CommonJS, source maps, and TypeScript declarations.
- React 18 and 19 peer dependency range.
- No runtime dependencies.
- Release artifact checks and a 5.1 KiB gzip budget per JavaScript entry point.
