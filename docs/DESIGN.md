# Reveal Sequence: Product and Technical Design

**Status:** Draft for `v0.1.0`
**Last updated:** 2026-09-10
**Target:** React 18 and React 19
**Package name:** `reveal-sequence`

## 1. Summary

Reveal Sequence is a small React library for progressively revealing newly added content.
It supports append-only text streams, static text reveals, and newly inserted keyed React
children through one scheduling model.

The product is not a general animation library, a typewriter, or a Markdown renderer. Its
single responsibility is:

> Reveal new content at a smooth, bounded cadence without disturbing content that has
> already settled.

The core product principle is:

> Animate the tail. Preserve the past.

For text, only the newly appended tail remains tokenized while it is animating. Settled
content is compacted back into ordinary text so long messages do not permanently retain one
DOM element per word.

## 2. Problem

Content commonly arrives in visually unpleasant bursts:

- an LLM or streaming API appends uneven text chunks;
- a live log or activity feed receives several records at once;
- a generative UI app inserts a group of cards or tool results;
- a marketing page reveals a sentence or paragraph when it enters the viewport.

Existing tools cover adjacent problems but not this complete contract:

- typewriters simulate typing and often mutate text at fixed intervals;
- split-text utilities operate on completed text and leave many wrapper elements;
- layout animation libraries animate add, remove, and move operations, but do not understand
  text units or stream backpressure;
- streaming Markdown renderers couple animation to parsing and AST reconciliation;
- server-side stream smoothing changes delivery cadence but does not provide visual motion.

The missing primitive is a parser-independent, append-aware reveal scheduler with a bounded
latency and a clean settled DOM.

## 3. Product positioning

### 3.1 Primary audience

- React developers building AI chat and copilot interfaces;
- developers building live logs, activity feeds, and progressive status output;
- generative UI systems that append keyed components;
- design-system authors who need a small reveal primitive without adopting a motion runtime.

### 3.2 Primary use case

The primary use case is a growing plain-text value:

```tsx
<RevealText
  value={message}
  mode="append"
  by="word"
  streaming={status === 'streaming'}
/>
```

Static copy and keyed groups are supported by the same engine, but they are secondary entry
points rather than the main product message.

### 3.3 Value proposition

- Only new content animates.
- Streaming delay cannot grow without bound.
- Stable content does not reanimate on subsequent renders.
- Settled text becomes clean, searchable, selectable DOM.
- React StrictMode and SSR behavior are explicit and tested.
- The package has no runtime dependencies beyond React peer dependencies.

## 4. Goals

`v0.1.0` must:

1. Reveal appended text by word, grapheme, or paragraph.
2. Reveal newly inserted keyed React children.
3. Keep reveal latency within a configurable `maxLag` budget.
4. Preserve stable token and child identities across React renders.
5. Handle chunks that end in the middle of a word without replaying that word.
6. Bound the number of animated text wrappers.
7. Compact settled text into ordinary text nodes.
8. Work in React 18 and 19, including development StrictMode.
9. Respect reduced-motion preferences.
10. Provide deterministic cleanup on completion and unmount.
11. Preserve readable content during SSR and when JavaScript is unavailable.
12. Ship TypeScript declarations and stay below the bundle budget.

## 5. Non-goals

`v0.1.0` will not provide:

- Markdown parsing or rendering;
- typewriter, backspace, scramble, or morphing effects;
- layout, removal, or reorder animations;
- spring physics or a general timeline engine;
- automatic visual-line measurement or line splitting;
- automatic traversal and splitting of arbitrary nested HTML;
- canvas, SVG text, or shader rendering;
- React Native support;
- Vue, Svelte, or Web Component adapters;
- a large animation preset catalog.

These boundaries keep the package focused and prevent direct competition with Motion, GSAP,
AutoAnimate, and full streaming Markdown renderers.

## 6. Product principles

### 6.1 Stable content is inert

Once a unit has settled, ordinary parent renders, prop identity changes, or later appended
content must not restart its animation.

### 6.2 Latency is more important than perfect staggering

When input arrives faster than it can be revealed, the scheduler may reveal several units in
one tick. It must not allow a decorative effect to make the interface feel slower than the
underlying stream.

### 6.3 Clean DOM is a feature

Per-word wrappers are temporary implementation details. The completed value should not retain
hundreds of spans indefinitely.

### 6.4 Progressive enhancement wins over a no-flash trick

Server-rendered content is readable by default. The library must not hide important content
forever when JavaScript fails to load.

### 6.5 Safe defaults, small escape hatches

The package ships two inexpensive presets and accepts custom Web Animations API keyframes. It
does not recreate a full animation framework.

## 7. Public API

The exact names may change before release, but the behavioral contract should remain stable.

### 7.1 `RevealText`

```tsx
type RevealTextProps = {
  value: string
  mode?: 'once' | 'append'
  by?: 'word' | 'grapheme' | 'paragraph'
  streaming?: boolean

  effect?: 'fade' | 'fade-up' | RevealKeyframes
  duration?: number
  interval?: number
  maxLag?: number
  maxAnimatedItems?: number

  trigger?: 'mount' | 'in-view' | 'controlled'
  active?: boolean
  locale?: string | string[]

  announce?: 'off' | 'sentence' | 'complete'
  onSettled?: () => void

  as?: React.ElementType
  className?: string
  style?: React.CSSProperties
}
```

Recommended streaming usage:

```tsx
<RevealText
  value={message.text}
  mode="append"
  by="word"
  streaming={message.status === 'streaming'}
  interval={28}
  maxLag={180}
  maxAnimatedItems={48}
/>
```

Static usage:

```tsx
<RevealText
  value="A product headline revealed one word at a time."
  mode="once"
  trigger="in-view"
/>
```

### 7.2 `RevealGroup`

```tsx
type RevealGroupProps = {
  children: React.ReactNode
  effect?: 'fade' | 'fade-up' | RevealKeyframes
  duration?: number
  interval?: number
  maxLag?: number
  trigger?: 'mount' | 'in-view' | 'controlled'
  active?: boolean
  onSettled?: () => void
  as?: React.ElementType
  itemAs?: React.ElementType
  className?: string
  itemClassName?: string
}
```

```tsx
<RevealGroup interval={60} maxLag={240}>
  {events.map((event) => (
    <EventCard key={event.id} event={event} />
  ))}
</RevealGroup>
```

Keys are mandatory for dynamic children. A missing key produces a development warning. The
component animates additions only; removal and reorder behavior is left to the host application
or a layout-animation library.

### 7.3 Effects

Built-in effects:

- `fade`: opacity only;
- `fade-up`: opacity plus a small vertical transform.

`blur` remains a demo-only experiment until profiling proves it safe for repeated units.

Custom effects use WAAPI-compatible keyframes:

```tsx
<RevealText
  value={text}
  effect={{
    keyframes: [
      { opacity: 0, transform: 'scale(.98)' },
      { opacity: 1, transform: 'scale(1)' },
    ],
    easing: 'cubic-bezier(.22, 1, .36, 1)',
  }}
/>
```

The public custom-effect options will whitelist timing fields that cannot break scheduler
ownership. Infinite iterations are not allowed.

## 8. Architecture

```text
incoming value or keyed children
              |
              v
     segmentation / key scan
              |
              v
       stable-unit reconciler
              |
              v
      bounded reveal scheduler
              |
              v
        WAAPI animation runner
              |
              v
     settled-prefix compaction
```

The implementation is divided into a framework-independent core and a small React adapter.
The core is initially internal so that an unstable low-level API does not become a public
compatibility burden.

### 8.1 Proposed modules

```text
src/
  core/
    segment.ts
    reconcile-text.ts
    reconcile-keys.ts
    scheduler.ts
    effects.ts
  react/
    RevealText.tsx
    RevealGroup.tsx
    RevealUnit.tsx
    useRevealTrigger.ts
    useReducedMotion.ts
  index.ts
```

## 9. Text model and segmentation

Each text unit carries source offsets rather than only an array index:

```ts
type TextUnit = {
  id: string
  start: number
  end: number
  text: string
  kind: 'content' | 'separator'
  complete: boolean
}
```

The identifier is derived from the unit's stable source start offset and the current stream
generation. This preserves identity when an incoming chunk extends the final partial word.

Example:

```text
chunk 1: "Stream"
chunk 2: "Streaming text"
```

The first unit retains its identity and changes from `Stream` to `Streaming`; it is not mounted
or animated a second time. `text` becomes a new unit only when its start offset first appears.

### 9.1 Segmentation rules

- `word` uses `Intl.Segmenter` with word granularity.
- `grapheme` uses `Intl.Segmenter` with grapheme granularity.
- `paragraph` treats two or more line breaks as a separator.
- whitespace and delimiters are preserved exactly.
- separators participate in source offsets but do not receive an animation wrapper.
- if `Intl.Segmenter` is unavailable, word mode falls back to whitespace boundaries and
  grapheme mode falls back to Unicode code points.
- the fallback emits a development warning because joined emoji and complex scripts may be
  less accurate.

Visual-line splitting is excluded because it depends on font loading, element width, and
repeated layout measurements.

## 10. Text reconciliation

### 10.1 Append path

The fast path applies when:

```ts
nextValue.startsWith(previousValue)
```

The reconciler:

1. Retains all stable previous units.
2. Updates the final mutable unit when a chunk extends it.
3. Creates units only for newly discovered source ranges.
4. Adds only new content units to the reveal queue.

Work is proportional to the appended suffix where practical. The implementation may retain a
small overlap around the previous final unit to account for changed segmentation boundaries.

### 10.2 Rewrite path

A shorter value or a value that does not preserve the previous prefix is considered a reset or
rewrite. In `v0.1.0`:

- the longest safe common prefix is retained;
- the changed suffix is replaced immediately;
- the changed suffix is not presented as simulated typing;
- a new stream generation prevents key collisions.

Animating arbitrary edits is intentionally deferred. Append-only behavior remains predictable
and easy to explain.

### 10.3 `mode="once"`

All content units created during the initial client mount are queued once. Later changes replace
the value without replaying the complete animation unless the component is explicitly remounted.

## 11. Reveal scheduler

The POC compresses the stagger within each individual render. The production scheduler must own
one queue across all chunks.

Each queued unit stores:

```ts
type PendingUnit = {
  id: string
  arrivedAt: number
  start: () => Animation | null
}
```

The scheduler uses one timer and processes the queue at `interval` boundaries. It derives a
batch size from the oldest deadline:

```text
deadline        = oldest.arrivedAt + maxLag
remaining       = max(1, deadline - now)
remainingSlots  = max(1, floor(remaining / interval))
batchSize       = max(1, ceil(queue.length / remainingSlots))
```

This produces the desired behavior:

- a small queue reveals one unit per interval;
- a large chunk spreads units across the remaining latency budget;
- a sustained fast stream gradually increases the batch size;
- overdue content is released immediately;
- the visual layer never delays content indefinitely.

Reduced motion bypasses the queue and settles units immediately.

### 11.1 Scheduler invariants

- There is at most one scheduler timer per reveal root.
- Units start in source order.
- A unit is started at most once per generation.
- `maxLag` applies to animation start, not animation completion.
- Animation duration may overlap subsequent starts.
- Unmount cancels pending timers and active animations.

## 12. Bounded animated tail and DOM compaction

`RevealText` renders two logical sections:

```text
[settled plain-text prefix][live animated units]
```

Only the live tail contains animation wrappers.

### 12.1 During streaming

- completed live units are marked settled by animation completion;
- when the settled portion of the live tail exceeds `maxAnimatedItems`, the oldest contiguous
  settled units are merged into the plain-text prefix;
- compaction updates are batched rather than issuing one React update per animation;
- units that are pending or still animating are never compacted.

The target invariant is:

```text
live wrapper count <= maxAnimatedItems + current pending batch
```

### 12.2 At stream completion

When `streaming` changes to `false`:

1. The scheduler drains the remaining queue within `maxLag`.
2. Active animations are allowed to finish unless reduced motion is requested.
3. All text units are compacted into ordinary text.
4. `onSettled` fires exactly once for the generation.

If the user currently has a selection inside the live tail, final compaction is deferred until
the selection leaves the root or a short safety timeout expires. This avoids unnecessarily
destroying an active copy selection.

## 13. Group reconciliation

`RevealGroup` maintains a set of keys that have committed in the current root.

- unseen keys enter the shared scheduler;
- seen keys render normally and never replay;
- a removed key is removed from the seen set after commit;
- re-adding a previously removed key counts as a new insertion;
- changing the order of existing keys does not animate;
- duplicate keys produce a development warning.

The library uses a wrapper for each item because arbitrary React components cannot be assumed to
forward refs. `itemAs` makes the wrapper configurable. A future headless hook may support
ref-forwarding applications without wrappers, but it is not required for `v0.1.0`.

## 14. Animation runtime

Animations use `Element.animate()` and return native `Animation` objects internally.

Rules:

- built-in effects animate only `opacity` and `transform`;
- `fill: 'both'` prevents a visible flash before a delayed animation begins;
- animation ownership stays inside `RevealUnit`;
- cleanup cancels the native animation and resets lifecycle state;
- development StrictMode cleanup followed by setup must create a fresh animation;
- ordinary prop updates must not replay settled units;
- no React state update occurs on an animation frame.

## 15. Trigger behavior

- `mount`: eligible units enter the scheduler after client commit.
- `in-view`: units remain pending until the root intersects the viewport.
- `controlled`: eligibility follows the `active` prop.

`IntersectionObserver` is shared where practical. If it is unavailable, `in-view` falls back to
`mount` rather than leaving content hidden.

Once an `in-view` root has activated, it stays active. Repeated viewport entry animations are out
of scope.

## 16. SSR and hydration

Server and initial client output must match.

Default SSR behavior prioritizes readable content:

- the server renders the complete value as visible plain text;
- the first client render matches the server output;
- append mode treats this initial value as already settled;
- only content received after hydration animates;
- JavaScript failure never leaves server content hidden.

Static `mode="once"` animation of server-rendered content is therefore best-effort rather than a
no-flash guarantee. An optional future `initial="hidden"` mode may trade progressive enhancement
for an entrance effect, but it will not be the default.

SSR acceptance requires tests with `renderToString()` and `hydrateRoot()` and zero hydration
warnings.

## 17. Accessibility

### 17.1 Text

- The full current value remains available as one accessible string.
- Visual token wrappers are hidden from assistive technology when an equivalent accessible
  string is provided.
- The library does not create a live region by default.
- `announce="sentence"` updates a polite off-screen live region only when a sentence boundary is
  completed. Existing text at hydration is not replayed.
- `announce="complete"` announces the final settled value once for each stream lifecycle.
- Reduced motion reveals content immediately.

Per-token live announcements are explicitly unsupported because they create noisy and repetitive
screen-reader output.

### 17.2 Groups

Group children retain their original semantics. A pending wrapper containing an interactive
element is `inert` until the reveal completes, preventing invisible controls from receiving focus.
Reduced motion removes `inert` immediately.

### 17.3 Keyboard and selection

- wrappers must not alter tab order after reveal;
- the root must not capture pointer or keyboard events;
- settled text must support normal selection, copy, and browser find behavior;
- focus is never moved by the library.

## 18. Performance budgets

Release budgets for `v0.1.0`:

| Metric | Budget |
|---|---:|
| Library bundle, excluding React | <= 5 KB gzip |
| Runtime dependencies | 0 |
| Default animated tail | <= 48 wrappers |
| Hard supported tail configuration | <= 128 wrappers |
| Scheduler timers per root | 1 |
| React updates per animation frame | 0 |
| Default stream-start latency | <= 1 interval |
| Maximum queued start latency | <= `maxLag` plus one timer tick |

Default word-level animations use `opacity` and `transform`. Grapheme mode is available but is
not recommended for long paragraphs because it increases DOM and animation counts.

Development warnings appear when:

- grapheme mode creates more than 500 units;
- `maxAnimatedItems` exceeds 128;
- dynamic group children lack stable keys;
- a custom effect attempts an infinite animation;
- `Intl.Segmenter` is unavailable and a fallback is used.

## 19. Browser and platform support

Target:

- current and previous major Chrome/Edge;
- current and previous major Firefox;
- current and previous major Safari;
- React 18 and React 19;
- Next.js App Router and Pages Router;
- Vite-based React applications.

`Element.animate()` absence falls back to immediate visibility. `Intl.Segmenter` absence uses the
documented lower-fidelity fallback. The package does not ship large polyfills.

## 20. Packaging

The published package should provide:

```text
dist/
  index.js
  index.cjs
  index.d.ts
```

Package requirements:

- ESM and CommonJS entry points;
- `react` and `react-dom` as peer dependencies;
- `sideEffects: false`;
- no required stylesheet;
- source maps;
- typed public exports;
- npm provenance on release;
- an explicit `files` allowlist;
- a package-size check in CI.

The framework-independent core remains private in `v0.1.0`. It may become a public `./core`
export only after its API has been validated through the React adapter.

## 21. Testing strategy

### 21.1 Unit tests

- word, grapheme, paragraph, whitespace, emoji, CJK, and RTL segmentation;
- partial-final-word identity preservation;
- append, reset, and rewrite reconciliation;
- scheduler order, batching, deadlines, cancellation, and reduced motion;
- settled-prefix compaction;
- duplicate and missing group key detection.

### 21.2 React integration tests

- React 18 and 19 compatibility;
- development StrictMode lifecycle;
- append updates do not replay stable units;
- controlled and in-view triggers;
- unmount cleanup;
- callback exactly-once behavior;
- interactive group children remain inert while hidden;
- rerenders with new object and callback identities do not replay content.

### 21.3 SSR tests

- server/client markup equality;
- visible no-JavaScript server output;
- append after hydration;
- no hydration warnings in Next.js fixtures.

### 21.4 Browser tests

Playwright coverage in Chromium, Firefox, and WebKit:

- real WAAPI timing;
- reduced motion;
- rapid and uneven streaming chunks;
- selection during streaming and compaction;
- clean DOM after settle;
- emoji and RTL visual output;
- viewport-triggered reveal.

### 21.5 Performance fixtures

- 2,000-word completed response;
- 100 updates per second for five seconds;
- one large 500-word chunk;
- 100 keyed cards inserted in uneven batches;
- simultaneous independent reveal roots.

Benchmarks record wrapper count, scheduler lag, React commit count, long tasks, and final DOM size.

## 22. Error and fallback behavior

The library should fail visible:

- no WAAPI: show content immediately;
- no IntersectionObserver: activate immediately;
- no Intl.Segmenter: use fallback segmentation;
- invalid timing value: clamp in production and warn in development;
- duplicate group key: render normally and warn;
- scheduler exception: flush the queue visibly and cancel the scheduler;
- animation cancellation: settle the affected unit without firing duplicate callbacks.

No runtime error should leave content permanently hidden.

## 23. Alternatives considered

### Depend on Motion

Rejected for the core package. Motion is excellent, but requiring it would make the package less
useful to teams that want one small reveal behavior. A future adapter may expose Motion variants.

### Use CSS animations only

Rejected as the only runtime. CSS is simple for mounted units, but native `Animation` handles give
the scheduler better cancellation, completion, and cleanup control.

### Include a Markdown renderer

Rejected. It creates parser coupling, security surface, a much larger dependency graph, and direct
competition with established streaming Markdown projects.

### Animate visual lines

Deferred. Correct line splitting requires font readiness, layout measurement, resize observation,
and resplitting. It is a separate product problem.

### Animate every streamed token forever

Rejected. It creates an unbounded DOM, harms inspection and browser find behavior, and makes long
conversations progressively more expensive.

## 24. POC assessment

The current POC proves:

- the `RevealText` and `RevealGroup` mental model;
- word, grapheme, and paragraph segmentation;
- source-offset unit identity, including partial final words;
- append, unchanged, rewrite, and reset reconciliation;
- WAAPI-based effects;
- one persistent deadline-aware scheduler per reveal root;
- keyed-child addition detection;
- in-view and controlled trigger plumbing;
- reduced-motion fallback;
- deterministic React StrictMode animation ownership;
- scheduler batching, cancellation, reuse, and completion behavior;
- bounded live-tail wrappers and settled-prefix compaction;
- selection-safe final compaction and clean completed DOM;
- readable SSR output and hydration-safe first client markup;
- sentence-batched and completion-based live-region announcements.

The POC does not yet prove:
- cross-browser timing and selection behavior;
- the final package-size budget.

POC code should be evolved, not treated as the production implementation.

## 25. Delivery plan

### Phase 1: Core correctness

- introduce source-offset text units;
- implement append/reset reconciliation;
- replace per-render delays with the persistent scheduler;
- add fake-timer unit tests;
- formalize effect types.

### Phase 2: DOM lifecycle

- implement settled-prefix compaction;
- enforce the bounded animated tail;
- add `streaming` and `onSettled` semantics;
- handle active selection during compaction;
- add clean-DOM assertions.

### Phase 3: Platform guarantees

- implement SSR-safe initial behavior;
- add React 18/19 and StrictMode matrix tests;
- implement accessibility announcement modes;
- add Chromium, Firefox, and WebKit tests;
- measure and enforce performance budgets.

### Phase 4: Package and public demo

- produce the library build and declarations;
- add size-limit and package-content checks;
- build focused static, stream, and group examples;
- publish an alpha release;
- collect feedback before freezing the API.

## 26. Release acceptance criteria

`v0.1.0` is ready when:

1. All goals in section 4 are implemented.
2. All performance budgets in section 18 pass.
3. React 18 and 19 test matrices pass.
4. Browser tests pass in Chromium, Firefox, and WebKit.
5. A completed stream has no token wrapper elements.
6. Stable content never reanimates during append updates.
7. A 2,000-word stream stays within the wrapper bound.
8. Reduced motion and missing browser APIs always leave content visible.
9. SSR fixtures hydrate without warnings.
10. The package tarball contains only documented distributable files.

## 27. Deferred decisions

The following questions should be answered with alpha-user evidence rather than speculation:

- whether `RevealGroup` belongs in the first stable release or a secondary entry point;
- whether consumers need a public headless scheduler hook;
- whether custom effects should accept functions in addition to keyframe objects;
- whether framework-neutral adapters justify exposing the internal core;
- whether `reveal-sequence` is the final public name.
