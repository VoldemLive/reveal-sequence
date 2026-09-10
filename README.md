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

<RevealGroup>
  {items.map((item) => <Card key={item.id} item={item} />)}
</RevealGroup>
```

Reveal Sequence uses `Intl.Segmenter` for locale-aware tokenization and the Web Animations API for
animation. Source-offset identities prevent a partially streamed word from replaying, while one
deadline-aware scheduler per root keeps new content inside the configured `maxLag` budget.
Rewrites appear immediately; newly appended text and newly inserted keyed children animate once.
