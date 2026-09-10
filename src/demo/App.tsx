import { useEffect, useMemo, useRef, useState } from 'react'
import { RevealGroup, RevealText, type RevealEffect } from '../lib'

const sample =
  'Streaming interfaces should feel calm, even when the network delivers text in unpredictable chunks.'

const chunks = [
  'Streaming ',
  'interfaces should ',
  'feel calm, ',
  'even when ',
  'the network delivers ',
  'text in ',
  'unpredictable chunks.',
]

const initialCards = [
  { id: 1, label: 'Stable content', detail: 'Existing elements never animate twice.' },
  { id: 2, label: 'Adaptive pacing', detail: 'Large chunks automatically use a tighter stagger.' },
]

export function App() {
  const [effect, setEffect] = useState<RevealEffect>('fade-up')
  const [staticRun, setStaticRun] = useState(0)
  const [streamText, setStreamText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [cards, setCards] = useState(initialCards)
  const timers = useRef<number[]>([])

  const unevenDelays = useMemo(() => [0, 160, 510, 660, 1120, 1230, 1720], [])

  const stopStream = () => {
    for (const timer of timers.current) window.clearTimeout(timer)
    timers.current = []
    setIsStreaming(false)
  }

  const runStream = () => {
    stopStream()
    setStreamText('')
    setIsStreaming(true)

    timers.current = chunks.map((chunk, index) =>
      window.setTimeout(() => {
        setStreamText((current) => current + chunk)
        if (index === chunks.length - 1) setIsStreaming(false)
      }, unevenDelays[index]),
    )
  }

  useEffect(() => () => stopStream(), [])

  const addCard = () => {
    const id = cards.length + 1
    setCards((current) => [
      ...current,
      {
        id,
        label: `New element ${id}`,
        detail: 'Only this keyed child receives an entrance animation.',
      },
    ])
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="eyebrow">REVEAL SEQUENCE / DEVELOPMENT PREVIEW</div>
        <h1>One reveal engine for text, streams, and UI.</h1>
        <p>
          A zero-runtime-dependency experiment that animates only the content that has just appeared.
        </p>
      </header>

      <section className="toolbar" aria-label="Demo controls">
        <label>
          Effect
          <select value={effect} onChange={(event) => setEffect(event.target.value as RevealEffect)}>
            <option value="fade-up">Fade up</option>
            <option value="fade">Fade</option>
            <option value="blur">Blur</option>
          </select>
        </label>
        <button onClick={() => setStaticRun((run) => run + 1)}>Replay static text</button>
        <button className="primary" disabled={isStreaming} onClick={runStream}>
          {isStreaming ? 'Streaming…' : 'Run uneven stream'}
        </button>
      </section>

      <section className="demo-grid">
        <article className="panel text-panel">
          <div className="panel-heading">
            <span>01</span>
            <h2>Static words</h2>
          </div>
          <RevealText
            as="p"
            by="word"
            className="large-copy"
            effect={effect}
            key={staticRun}
            mode="once"
            value={sample}
          />
          <code>by=&quot;word&quot; mode=&quot;once&quot;</code>
        </article>

        <article className="panel stream-panel">
          <div className="panel-heading">
            <span>02</span>
            <h2>Append-aware stream</h2>
          </div>
          <div className="stream-window">
            <span className="assistant-mark">A</span>
            {streamText ? (
              <RevealText
                as="p"
                by="word"
                className="stream-copy"
                effect={effect}
                interval={48}
                maxAnimatedItems={8}
                maxLag={180}
                mode="append"
                streaming={isStreaming}
                value={streamText}
              />
            ) : (
              <p className="placeholder">Run the stream to simulate uneven network chunks.</p>
            )}
          </div>
          <code>mode=&quot;append&quot; maxLag={'{180}'}</code>
        </article>

        <article className="panel group-panel">
          <div className="panel-heading">
            <span>03</span>
            <h2>Keyed React children</h2>
          </div>
          <RevealGroup className="card-list" effect={effect} itemClassName="feature-card">
            {cards.map((card) => (
              <div key={card.id}>
                <strong>{card.label}</strong>
                <span>{card.detail}</span>
              </div>
            ))}
          </RevealGroup>
          <button onClick={addCard}>Add one element</button>
        </article>
      </section>

      <footer>
        <span>React 19</span>
        <span>Web Animations API</span>
        <span>Intl.Segmenter</span>
        <span>Reduced motion aware</span>
      </footer>
    </main>
  )
}
