# Reveal Sequence

An append-aware React reveal library for text, streaming strings, and keyed UI elements.

The product direction and target architecture are defined in
[the design document](./docs/DESIGN.md). Delivery progress is tracked in the
[implementation plan](./docs/IMPLEMENTATION_PLAN.md).

## Run locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm run check
```

## Package build

```bash
npm run build:package
npm run check:package
```

The build produces ESM, CommonJS, source maps, and TypeScript declarations. The package check
verifies public exports, the dry-run tarball, and a 5 KB gzip limit per JavaScript entry point.

## API preview

```tsx
<RevealText
  value={streamedText}
  by="word"
  mode="append"
  streaming={isStreaming}
  maxAnimatedItems={48}
/>

<RevealText value={article} by="paragraph" mode="once" />

<RevealText
  announce="sentence"
  streaming={isStreaming}
  value={streamedText}
/>

<RevealGroup>
  {items.map((item) => <Card key={item.id} item={item} />)}
</RevealGroup>
```

Reveal Sequence uses `Intl.Segmenter` for locale-aware tokenization and the Web Animations API for
animation. Source-offset identities prevent a partially streamed word from replaying, while one
deadline-aware scheduler per root keeps new content inside the configured `maxLag` budget.
Rewrites appear immediately; newly appended text and newly inserted keyed children animate once. Server output remains readable plain text and hydrates without changing the initial markup.

Accessibility is quiet by default: no live region is rendered unless `announce` is set. Use
`announce="sentence"` to announce newly completed sentences during a stream, or
`announce="complete"` to announce the final value once that stream has settled.

## Motion and triggers

Use GPU-friendly presets: `fade`, `fade-up`, `fade-down`, `slide-left`, `slide-right`,
and `scale`. `blur` is available for short content but is more expensive.

```tsx
<RevealText
  value={text}
  effect="slide-right"
  easing="cubic-bezier(.22, 1, .36, 1)"
  duration={280}
  trigger="in-view"
  inView={{ rootMargin: '0px 0px -12% 0px', threshold: 0.2 }}
/>

<RevealText
  value={text}
  effect={{
    easing: 'linear',
    keyframes: [
      { opacity: 0, transform: 'scale(.96)' },
      { opacity: 1, transform: 'scale(1)' },
    ],
  }}
/>
```

The scheduler continues to own delays and batching, so custom visual settings cannot bypass the
configured `maxLag` budget.

## Sentence streaming

`by="sentence"` is designed for calm long-form output. Complete sentences received in a new
chunk animate as one unit. An unfinished trailing sentence remains visible immediately and grows
without replaying its animation when its terminator arrives.

```tsx
<RevealText
  by="sentence"
  streaming={isStreaming}
  value={streamedText}
/>
```

## Bounded animated tail

`maxAnimatedItems` is a configurable safety limit, not a truncation limit. When a burst exceeds
it, older queued units become ordinary visible text immediately; only the newest tail keeps reveal
wrappers and motion. The default is `48`.

```tsx
<RevealText streaming value={text} maxAnimatedItems={24} />
```
