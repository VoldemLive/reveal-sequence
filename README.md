# Reveal Sequence

Append-aware reveal sequencing for React text streams and newly inserted keyed UI.

Reveal Sequence is for interfaces where content arrives over time: streamed responses, activity feeds, logs, and incremental UI. It animates what is new, keeps previously read content stable, and compacts settled text back to ordinary DOM.

## Install

```bash
npm install reveal-sequence
```

React and React DOM are peer dependencies. React 18.2 through 19 are supported.

## Start with streamed text

```tsx
import { RevealText } from "reveal-sequence"

export function Message({ isStreaming, text }: { isStreaming: boolean; text: string }) {
  return <RevealText streaming={isStreaming} value={text} />
}
```

The default contract is `mode="append"`: only new content is scheduled. Stable content never replays when the parent rerenders or another chunk arrives.

## Text controls

Choose how text is segmented, then tune the same timing controls used by keyed UI.

```tsx
<RevealText
  value={message}
  streaming={isStreaming}
  by="word"
  effect="fade-up"
  duration={420}
  interval={42}
  maxLag={240}
  maxAnimatedItems={48}
/>
```

| Prop | Default | Purpose |
| --- | --- | --- |
| `value` | required | Current text value. Appended content is reconciled without replaying the stable prefix. |
| `by` | `"word"` | `"grapheme"`, `"word"`, `"sentence"`, or `"paragraph"`. Use `locale` for locale-aware word segmentation. |
| `mode` | `"append"` | `"append"` animates incoming units; `"once"` animates only the initial value. |
| `streaming` | `false` | Keeps the arriving tail live. Final DOM compaction waits until the stream settles. |
| `maxAnimatedItems` | `48` | Hard cap on animated text wrappers. Older queued content becomes ordinary text immediately. |
| `announce` | `"off"` | Optional polite announcement mode: `"sentence"` or `"complete"`. |
| `onSettled` | — | Called after the current text generation has settled and final compaction is complete. |

### Streaming details

- A chunk that ends in the middle of a word remains visible and is not replayed when that word finishes.
- In `by="sentence"` mode, completed sentences animate as units while an unfinished trailing sentence stays readable and grows in place.
- Rewrites do not pretend to be appends: the next value is rendered immediately and a new generation starts.
- Whitespace remains ordinary text, so punctuation and spaces retain their original order and copy correctly.

## Keyed UI controls

Use `RevealGroup` for new React children. Existing keys stay inert; only newly inserted keys enter the sequence. This is intentionally an entrance primitive, not a layout or removal animation library.

```tsx
import { RevealGroup } from "reveal-sequence"

<RevealGroup effect="slide-right" duration={360} interval={80} maxLag={280}>
  {events.map((event) => (
    <EventCard key={event.id} event={event} />
  ))}
</RevealGroup>
```

| Prop | Default | Purpose |
| --- | --- | --- |
| `children` | required | Keyed React children. New keys animate; seen keys preserve their state. |
| `as` / `itemAs` | `"div"` | Choose the root and temporary child wrapper elements. |
| `itemClassName` | — | Class applied to each scheduled wrapper. |
| `effect`, `duration`, `easing` | `"fade-up"`, `420` | Visual timing shared with `RevealText`. |
| `interval`, `maxLag` | `70`, `280` | Start cadence and maximum allowed reveal lag. |
| `trigger`, `active`, `inView` | `"mount"` | Run on mount, in view, or under an explicit boolean. |
| `onSettled` | — | Called when the group scheduler becomes idle. |

Keep keys stable. Removal and reorder transitions belong to the host application or a dedicated layout-animation library.

## Effects and triggers

Built-in effects are `fade`, `fade-up`, `fade-down`, `slide-left`, `slide-right`, `scale`, and `blur`. Prefer transform and opacity effects for long streams; blur is best reserved for short content.

Custom Web Animations API keyframes are supported without taking control away from the scheduler:

```tsx
<RevealText
  value={text}
  effect={{
    easing: "linear",
    keyframes: [
      { opacity: 0, transform: "scale(.96)" },
      { opacity: 1, transform: "scale(1)" },
    ],
  }}
/>
```

```tsx
<RevealText
  value={text}
  trigger="in-view"
  inView={{ rootMargin: "0px 0px -12% 0px", threshold: 0.2 }}
/>

<RevealText value={text} trigger="controlled" active={isOpen} />
```

## Runtime behavior

- **Append-aware.** Only incoming text units and new keyed children animate.
- **Latency-bounded.** The scheduler compresses a burst before decorative motion can exceed `maxLag`.
- **DOM-conscious.** Only the newest text tail keeps wrappers; settled history becomes plain text.
- **Accessible by default.** Content remains readable on the server and without JavaScript. No live region is rendered unless `announce` is requested. Reduced-motion preferences settle content immediately.
- **Dependency-light.** React and React DOM are peers; the package has no runtime dependencies. It ships ESM, CommonJS, source maps, and TypeScript declarations.

The release build enforces a maximum of 5.1 KiB gzip for each JavaScript entry point.

## Browser platform

Reveal Sequence uses `Intl.Segmenter` when available for locale-aware grapheme and word segmentation, with a basic fallback for older environments. Animations use the Web Animations API; when it is unavailable, content remains visible and settles without motion.

## Development

```bash
npm install
npm run dev
npm run check
```

`npm run check` runs type checks, the demo build, library build, package artifact validation, dry-run packaging, and the test suite.

## Scope

Reveal Sequence does not parse Markdown, animate layout/reorder/removal, split arbitrary nested HTML, or provide a general timeline engine. It is a focused primitive for revealing incremental text and keyed UI without replaying the past.

## License

MIT
