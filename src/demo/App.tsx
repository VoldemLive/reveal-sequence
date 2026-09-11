import { useEffect, useMemo, useRef, useState } from 'react'
import {
  RevealGroup,
  RevealText,
  type RevealGranularity,
  type RevealPresetEffect,
} from '../lib'

const narrativeChunks = [
  'Streaming UI should feel responsive, even when the network is not. ',
  'Reveal Sequence keeps the past stable and animates only the arriving tail. ',
  'When a burst arrives, it protects the DOM before decorative motion.',
]

const burstText = Array.from(
  { length: 96 },
  (_, index) => `chunk-${String(index + 1).padStart(2, '0')}`,
).join(' ')

const initialCards = [
  { id: 1, label: 'Stable history', detail: 'Previous content remains inert after each append.' },
  { id: 2, label: 'Latency budget', detail: 'The scheduler accelerates before motion falls behind.' },
]

const maxEventCards = 4

const previewEffects: ReadonlyArray<{ value: RevealPresetEffect; icon: string; label: string }> = [
  { value: 'fade-up', icon: '↑', label: 'Fade up' },
  { value: 'fade-down', icon: '↓', label: 'Fade down' },
  { value: 'slide-left', icon: '←', label: 'Slide left' },
  { value: 'slide-right', icon: '→', label: 'Slide right' },
  { value: 'scale', icon: 'scale', label: 'Scale' },
  { value: 'fade', icon: '◐', label: 'Fade' },
  { value: 'blur', icon: '✦', label: 'Blur' },
]

export function App() {
  const [effect, setEffect] = useState<RevealPresetEffect>('fade-up')
  const [granularity, setGranularity] = useState<RevealGranularity>('word')
  const [duration, setDuration] = useState(420)
  const [maxAnimatedItems, setMaxAnimatedItems] = useState(24)
  const [streamText, setStreamText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isBurst, setIsBurst] = useState(false)
  const [liveWrappers, setLiveWrappers] = useState(0)
  const [staticRun, setStaticRun] = useState(0)
  const [cards, setCards] = useState(initialCards)
  const [exitingCardIds, setExitingCardIds] = useState<number[]>([])
  const [showAddControl, setShowAddControl] = useState(true)
  const [isAddControlExiting, setIsAddControlExiting] = useState(false)
  const nextCardId = useRef(initialCards.length + 1)
  const cardCount = useRef(initialCards.length)
  const timers = useRef<number[]>([])

  const selectedChunks = useMemo(
    () =>
      granularity === 'sentence'
        ? narrativeChunks
        : narrativeChunks.flatMap((sentence) => sentence.match(/\S+\s*/gu) ?? []),
    [granularity],
  )
  const setPreviewEffect = (nextEffect: RevealPresetEffect) => {
    setEffect(nextEffect)
    setStaticRun((run) => run + 1)
  }

  const activeGranularity = isBurst ? 'word' : granularity

  const stopStream = () => {
    for (const timer of timers.current) window.clearTimeout(timer)
    timers.current = []
    setIsStreaming(false)
  }

  const runStream = () => {
    stopStream()
    setIsBurst(false)
    setStreamText('')
    setIsStreaming(true)

    timers.current = selectedChunks.map((chunk, index) =>
      window.setTimeout(
        () => {
          setStreamText((current) => current + chunk)
          if (index === selectedChunks.length - 1) setIsStreaming(false)
        },
        index === 0 ? 0 : index * (granularity === 'sentence' ? 640 : 72),
      ),
    )
  }

  const runBurst = () => {
    stopStream()
    setIsBurst(true)
    setStreamText(burstText)
    setIsStreaming(true)
    timers.current = [window.setTimeout(() => setIsStreaming(false), 900)]
  }

  useEffect(() => () => stopStream(), [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const root = document.querySelector('.stream-output')
      setLiveWrappers(root?.querySelectorAll('span[aria-hidden="true"]').length ?? 0)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [streamText, isStreaming, maxAnimatedItems])

  const addCard = () => {
    if (cardCount.current >= maxEventCards || isAddControlExiting) return

    const id = nextCardId.current
    nextCardId.current += 1
    cardCount.current += 1
    setCards((current) => [
      ...current,
      {
        id,
        label: `New event ${id}`,
        detail: 'Only this keyed React child receives entrance motion.',
      },
    ])
    if (cardCount.current === maxEventCards) setIsAddControlExiting(true)
  }

  const removeCard = (id: number) => {
    setExitingCardIds((current) => (current.includes(id) ? current : [...current, id]))
  }

  const finalizeCardRemoval = (id: number) => {
    cardCount.current -= 1
    setCards((current) => current.filter((card) => card.id !== id))
    setExitingCardIds((current) => current.filter((cardId) => cardId !== id))
    setShowAddControl(true)
  }

  const finalizeAddControlExit = () => {
    if (!isAddControlExiting) return
    if (cardCount.current < maxEventCards) {
      setIsAddControlExiting(false)
      setShowAddControl(true)
      return
    }
    setShowAddControl(false)
    setIsAddControlExiting(false)
  }

  const code = `<RevealText\n  by="${activeGranularity}"\n  effect="${effect}"\n  duration={${duration}}\n  maxAnimatedItems={${maxAnimatedItems}}\n  streaming={isStreaming}\n  value={text}\n/>`
  const scrollToTop = () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  return (
    <main className="playground-shell">
      <nav className="topbar" aria-label="Reveal Sequence">
        <a className="wordmark" href="#top" aria-label="Reveal Sequence home" onClick={(event) => { event.preventDefault(); scrollToTop() }}>
          reveal<span>sequence</span>
        </a>
        <div className="topbar-meta">
          <span>React primitive</span>
          <a href="https://github.com/VoldemLive/reveal-sequence">GitHub ↗</a>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">APPEND-AWARE REVEAL ENGINE</p>
          <h1>Make incoming content feel intentional.</h1>
          <p className="hero-lede">
            A React primitive for streams, text, and incremental UI. It animates what is new,
            preserves what is read, and keeps a hard budget on live animation wrappers.
          </p>
        </div>

        <section className="hero-stage" aria-label="Live headline preview">
          <div className="stage-orbit orbit-one" />
          <div className="stage-orbit orbit-two" />
          <div className="stage-topline">
            <p className="stage-label">STATIC / WORD</p>
            <div className="stage-effect-picker" role="group" aria-label="Preview animation effect">
              {previewEffects.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={preset.value === effect ? 'effect-icon-button is-active' : 'effect-icon-button'}
                  aria-label={preset.label}
                  aria-pressed={preset.value === effect}
                  title={preset.label}
                  onClick={() => setPreviewEffect(preset.value)}
                >
                  {preset.value === 'scale' ? (
                    <svg className="scale-effect-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />
                    </svg>
                  ) : (
                    <span aria-hidden="true">{preset.icon}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <RevealText
            as="p"
            by="word"
            className="stage-copy"
            duration={duration}
            effect={effect}
            key={staticRun}
            mode="once"
            value="New content deserves a first impression."
          />
          <div className="stage-footer">
            <span>SSR-safe</span>
            <span>Reduced-motion aware</span>
          </div>
        </section>
      </header>

      <section className="proof-strip" aria-label="Product guarantees">
        <div><strong>Append-aware</strong><span>Stable content never replays.</span></div>
        <div><strong>Latency-bounded</strong><span>Motion yields before data feels late.</span></div>
        <div><strong>DOM-conscious</strong><span>Only the newest tail keeps wrappers.</span></div>
      </section>

      <section className="studio" aria-labelledby="studio-title">
        <div className="section-intro">
          <p className="eyebrow">INTERACTIVE STUDIO</p>
          <h2 id="studio-title">Tune the feeling. Keep the contract.</h2>
          <p>
            These controls change the real component. The scheduler still owns batching and
            latency, regardless of the visual treatment you choose.
          </p>
        </div>

        <div className="studio-grid">
          <aside className="control-deck" aria-label="Reveal controls">
            <label>
              Granularity
              <select
                value={granularity}
                onChange={(event) => setGranularity(event.target.value as RevealGranularity)}
              >
                <option value="grapheme">Grapheme</option>
                <option value="word">Word</option>
                <option value="sentence">Sentence</option>
                <option value="paragraph">Paragraph</option>
              </select>
            </label>
            <label>
              Duration <output>{duration}ms</output>
              <input
                type="range"
                min="160"
                max="720"
                step="20"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              />
            </label>
            <label>
              Animated tail <output>{maxAnimatedItems}</output>
              <input
                type="range"
                min="4"
                max="48"
                step="4"
                value={maxAnimatedItems}
                onChange={(event) => setMaxAnimatedItems(Number(event.target.value))}
              />
            </label>
            <button className="button primary wide" disabled={isStreaming} onClick={runStream}>
              Run uneven stream
            </button>
            <button className="button ghost wide" disabled={isStreaming} onClick={runBurst}>
              Run 96-word burst
            </button>
          </aside>

          <article className="stream-card" aria-label="Live stream output">
            <div className="card-topline">
              <span className="signal"><i />LIVE STREAM</span>
              <span>{isBurst ? 'WORD / BURST' : `${granularity.toUpperCase()} / APPEND`}</span>
            </div>
            <div className="chat-row">
              <div className="assistant-avatar">R</div>
              {streamText ? (
                <RevealText
                  as="p"
                  by={activeGranularity}
                  className="stream-output"
                  duration={duration}
                  effect={effect}
                  interval={42}
                  maxAnimatedItems={maxAnimatedItems}
                  maxLag={180}
                  mode="append"
                  streaming={isStreaming}
                  value={streamText}
                />
              ) : (
                <p className="stream-placeholder">Choose a mode, then run the stream.</p>
              )}
            </div>
            <div className="stream-metrics">
              <div>
                <span>Live wrappers</span>
                <strong>{streamText ? liveWrappers : '—'} / {maxAnimatedItems}</strong>
              </div>
              <div>
                <span>Max start lag</span>
                <strong>180ms</strong>
              </div>
              <div>
                <span>Stream state</span>
                <strong>{isStreaming ? 'Receiving' : streamText ? 'Settled' : 'Ready'}</strong>
              </div>
            </div>
          </article>

          <pre className="code-card" aria-label="Current API example"><code>{code}</code></pre>
        </div>
      </section>

      <section className="systems-grid" aria-label="Runtime safeguards and group demo">
        <article className="architecture-note">
          <div>
            <p className="eyebrow">RUNTIME SAFEGUARD</p>
            <h2>Wrappers are a tail, not history.</h2>
          </div>
          <p>
            <code>maxAnimatedItems</code> is a hard budget. When a burst arrives, older content
            returns to ordinary text and only the newest configurable tail keeps motion wrappers.
          </p>
          <div className="tail-diagram" aria-hidden="true">
            <span className="settled-tail" />
            <span className="settled-tail" />
            <span className="settled-tail" />
            <span className="active-tail" />
            <span className="active-tail" />
            <span className="active-tail" />
          </div>
          <div className="diagram-labels"><span>plain text history</span><span>bounded animated tail</span></div>
        </article>

        <article className="feature-panel group-panel" aria-label="Interactive RevealGroup demo">
          <div className="group-panel-heading">
            <div>
              <p className="eyebrow">LIVE GROUP DEMO</p>
              <h2>Animate incremental React children.</h2>
            </div>
            <span className="event-count">{cards.length} / {maxEventCards}</span>
          </div>
          <RevealGroup className="event-list" duration={duration} effect={effect} itemClassName="event-reveal">
            {cards.map((card) => {
              const isExiting = exitingCardIds.includes(card.id)

              return (
                <article
                  className={`event-card${isExiting ? ` is-exiting exit-${effect}` : ''}`}
                  key={card.id}
                  onAnimationEnd={() => {
                    if (isExiting) finalizeCardRemoval(card.id)
                  }}
                >
                  <div>
                    <strong>{card.label}</strong>
                    <span>{card.detail}</span>
                  </div>
                  <button
                    aria-label={`Remove ${card.label}`}
                    className="event-remove"
                    disabled={isExiting}
                    onClick={() => removeCard(card.id)}
                    type="button"
                  >
                    ×
                  </button>
                </article>
              )
            })}
            {showAddControl ? (
              <button
                className={`event-add${isAddControlExiting ? ` is-exiting exit-${effect}` : ''}`}
                disabled={isAddControlExiting}
                key="add-event"
                onAnimationEnd={finalizeAddControlExit}
                onClick={addCard}
                type="button"
              >
                <span>Add an event</span>
                <span aria-hidden="true">+</span>
              </button>
            ) : null}
          </RevealGroup>
        </article>
      </section>

      <footer className="footer">
        <span>React 18 / 19</span>
        <span>Web Animations API</span>
        <span>Intl.Segmenter</span>
        <span>Zero runtime dependencies</span>
      </footer>
    </main>
  )
}
