import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  RevealGroup,
  RevealText,
  type RevealGranularity,
  type RevealPresetEffect,
} from '../lib'

import {
  activityActions,
  createActivityCard,
  createStreamChunks,
  granularityOptions,
  initialCards,
  maxActivityCards,
  narrativeText,
  previewEffects,
  streamUnitLabel,
  type ActivityKind,
} from './model'
import { PageHeader } from './components/PageHeader'
import { RevealGroupApiReference, RevealTextApiReference } from './components/ApiReferences'

export function App() {
  const [effect, setEffect] = useState<RevealPresetEffect>('fade-up')
  const [groupEffect, setGroupEffect] = useState<RevealPresetEffect>('fade-up')
  const [groupDuration, setGroupDuration] = useState(480)
  const [groupInterval, setGroupInterval] = useState(100)
  const [groupRun, setGroupRun] = useState(0)
  const [isGroupAnimating, setIsGroupAnimating] = useState(false)
  const [granularity, setGranularity] = useState<RevealGranularity>('word')
  const [isGranularityMenuOpen, setIsGranularityMenuOpen] = useState(false)
  const [duration, setDuration] = useState(420)
  const [textInterval, setTextInterval] = useState(70)
  const [textRun, setTextRun] = useState(0)
  const [maxAnimatedItems, setMaxAnimatedItems] = useState(24)
  const [streamText, setStreamText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [liveWrappers, setLiveWrappers] = useState(0)
  const [staticRun, setStaticRun] = useState(0)
  const [cards, setCards] = useState(initialCards)
  const [exitingCardIds, setExitingCardIds] = useState<number[]>([])
  const [showActivityActions, setShowActivityActions] = useState(true)
  const [areActivityActionsExiting, setAreActivityActionsExiting] = useState(false)
  const [isInstallCommandCopied, setIsInstallCommandCopied] = useState(false)
  const nextCardId = useRef(initialCards.length + 1)
  const cardCount = useRef(initialCards.length)
  const granularityMenuRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  const installCopyTimer = useRef<number | undefined>(undefined)

  const selectedChunks = useMemo(
    () => createStreamChunks(narrativeText, granularity),
    [granularity],
  )
  const textMaxLag = Math.max(900, textInterval * 6)
  const groupMaxLag = Math.max(900, groupInterval * 6)

  const stopStream = () => {
    for (const timer of timers.current) window.clearTimeout(timer)
    timers.current = []
    setIsStreaming(false)
  }

  const runStream = () => {
    stopStream()
    setTextRun((run) => run + 1)
    setLiveWrappers(0)
    setStreamText('')
    setIsStreaming(true)

    timers.current = selectedChunks.map((chunk, index) =>
      window.setTimeout(
        () => {
          setStreamText((current) => current + chunk)
          if (index === selectedChunks.length - 1) setIsStreaming(false)
        },
        index === 0 ? 0 : index * textInterval,
      ),
    )
  }

  const replayTextPreview = () => {
    if (!isStreaming && streamText) runStream()
  }

  const setPreviewEffect = (nextEffect: RevealPresetEffect) => {
    setEffect(nextEffect)
    setStaticRun((run) => run + 1)
    replayTextPreview()
  }

  const setTextDuration = (nextDuration: number) => {
    setDuration(nextDuration)
    replayTextPreview()
  }

  const setTextIntervalValue = (nextInterval: number) => {
    setTextInterval(nextInterval)
    replayTextPreview()
  }

  const copyInstallCommand = async () => {
    try {
      await navigator.clipboard.writeText('npm install reveal-sequence')
      setIsInstallCommandCopied(true)
      if (installCopyTimer.current) window.clearTimeout(installCopyTimer.current)
      installCopyTimer.current = window.setTimeout(() => setIsInstallCommandCopied(false), 1_800)
    } catch {
      setIsInstallCommandCopied(false)
    }
  }

  useEffect(() => () => {
    stopStream()
    if (installCopyTimer.current) window.clearTimeout(installCopyTimer.current)
  }, [])

  useEffect(() => {
    if (!isGranularityMenuOpen) return undefined

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!granularityMenuRef.current?.contains(event.target as Node)) setIsGranularityMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [isGranularityMenuOpen])

  const measureLiveWrappers = useCallback(() => {
    window.requestAnimationFrame(() => {
      const root = document.querySelector('.stream-output')
      setLiveWrappers(root?.querySelectorAll('span[aria-hidden="true"]').length ?? 0)
    })
  }, [])

  useEffect(() => {
    measureLiveWrappers()
  }, [measureLiveWrappers, streamText, isStreaming, maxAnimatedItems])

  const appendActivityCards = (kinds: ActivityKind[]) => {
    if (cardCount.current >= maxActivityCards || areActivityActionsExiting) return

    const acceptedKinds = kinds.slice(0, maxActivityCards - cardCount.current)
    const additions = acceptedKinds.map((kind) => {
      const id = nextCardId.current
      nextCardId.current += 1
      return createActivityCard(id, kind)
    })

    cardCount.current += additions.length
    setCards((current) => [...current, ...additions])
    if (cardCount.current === maxActivityCards) setAreActivityActionsExiting(true)
  }

  const runMixedBurst = () => {
    if (cardCount.current >= maxActivityCards || areActivityActionsExiting) return
    setIsGroupAnimating(true)
    appendActivityCards(activityActions.map((action) => action.kind))
  }

  const replayGroup = () => {
    setIsGroupAnimating(true)
    setGroupRun((run) => run + 1)
  }
  const setGroupPreset = (nextEffect: RevealPresetEffect) => {
    setGroupEffect(nextEffect)
    replayGroup()
  }

  const removeCard = (id: number) => {
    setExitingCardIds((current) => (current.includes(id) ? current : [...current, id]))
  }

  const finalizeCardRemoval = (id: number) => {
    cardCount.current -= 1
    setCards((current) => current.filter((card) => card.id !== id))
    setExitingCardIds((current) => current.filter((cardId) => cardId !== id))
    setShowActivityActions(true)
  }

  const finalizeActivityActionsExit = () => {
    if (!areActivityActionsExiting) return
    if (cardCount.current < maxActivityCards) {
      setAreActivityActionsExiting(false)
      setShowActivityActions(true)
      return
    }
    setShowActivityActions(false)
    setAreActivityActionsExiting(false)
  }

  const code = `<RevealText\n  by="${granularity}"\n  effect="${effect}"\n  duration={${duration}}\n  interval={${textInterval}}\n  maxAnimatedItems={${maxAnimatedItems}}\n  maxLag={${textMaxLag}}\n  streaming={isStreaming}\n  value={text}\n/>`
  const groupCode = `<RevealGroup\n  effect="${groupEffect}"\n  duration={${groupDuration}}\n  interval={${groupInterval}}\n  maxLag={${groupMaxLag}}\n>\n  {children}\n</RevealGroup>`
  const scrollToTop = () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  return (
    <main className="playground-shell">
      <PageHeader
        duration={duration}
        effect={effect}
        isInstallCommandCopied={isInstallCommandCopied}
        onCopyInstallCommand={() => void copyInstallCommand()}
        onScrollToTop={scrollToTop}
        onSelectEffect={setPreviewEffect}
        staticRun={staticRun}
      />

      <section className="studio" id="text-demo" aria-labelledby="studio-title">
        <div className="section-intro">
          <p className="eyebrow">INTERACTIVE STUDIO</p>
          <h2 id="studio-title">Tune the feeling. Keep the contract.</h2>
          <p>
            These controls change the real component. The scheduler still owns batching and
            latency, regardless of the visual treatment you choose.
          </p>
        </div>

        <div className="studio-grid">
          <aside className="control-deck" aria-label="RevealText controls">
            <div className="stream-effect-picker">
              <span className="control-label">Effect</span>
              <div className="stage-effect-picker stream-effect-options" role="group" aria-label="RevealText effect">
                {previewEffects.map((preset) => (
                  <button
                    aria-label={preset.label}
                    aria-pressed={effect === preset.value}
                    className={`effect-icon-button${effect === preset.value ? ' is-active' : ''}`}
                    key={preset.value}
                    onClick={() => setPreviewEffect(preset.value)}
                    title={preset.label}
                    type="button"
                  >
                    {preset.value === 'scale' ? (
                      <svg className="scale-effect-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />
                      </svg>
                    ) : preset.icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="granularity-control" ref={granularityMenuRef}>
              <span className="control-label">Granularity</span>
              <button
                aria-controls="granularity-options"
                aria-expanded={isGranularityMenuOpen}
                className="granularity-trigger"
                onClick={() => setIsGranularityMenuOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setIsGranularityMenuOpen(false)
                  if (event.key === 'ArrowDown') setIsGranularityMenuOpen(true)
                }}
                type="button"
              >
                <span>{granularityOptions.find((option) => option.value === granularity)?.label}</span>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" /></svg>
              </button>
              {isGranularityMenuOpen ? (
                <div className="granularity-menu" id="granularity-options" role="listbox" aria-label="Granularity">
                  {granularityOptions.map((option) => (
                    <button
                      aria-selected={granularity === option.value}
                      key={option.value}
                      onClick={() => {
                        stopStream()
                        setStreamText('')
                        setLiveWrappers(0)
                        setGranularity(option.value)
                        setIsGranularityMenuOpen(false)
                      }}
                      role="option"
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <label>
              Duration <output>{duration}ms</output>
              <input
                type="range"
                min="160"
                max="3000"
                step="20"
                value={duration}
                onChange={(event) => setTextDuration(Number(event.target.value))}
              />
            </label>
            <label>
              Interval <output>{textInterval}ms</output>
              <input
                type="range"
                min="0"
                max="1200"
                step="20"
                value={textInterval}
                onChange={(event) => setTextIntervalValue(Number(event.target.value))}
              />
            </label>
            <label>
              {streamUnitLabel[granularity]} wrapper cap <output>{maxAnimatedItems}</output>
              <input
                type="range"
                min="4"
                max="48"
                step="4"
                value={maxAnimatedItems}
                onChange={(event) => setMaxAnimatedItems(Number(event.target.value))}
              />
            </label>
            <div className="stream-actions">
              <button className="button primary" disabled={isStreaming} onClick={runStream}>
                Run uneven stream
              </button>
            </div>
            <pre className="code-card" aria-label="Current API example"><code>{code}</code></pre>
          </aside>

          <article className="stream-card" aria-label="Live stream output">
            <div className="card-topline">
              <span className="signal"><i />LIVE STREAM</span>
              <span>{[granularity.toUpperCase(), 'APPEND'].join(' / ')}</span>
            </div>
            <div className="chat-row">
              <div className="assistant-avatar">R</div>
              {streamText ? (
                <RevealText
                  as="p"
                  by={granularity}
                  className="stream-output"
                  duration={duration}
                  effect={effect}
                  interval={textInterval}
                  key={textRun}
                  maxAnimatedItems={maxAnimatedItems}
                  maxLag={textMaxLag}
                  mode="append"
                  onSettled={measureLiveWrappers}
                  streaming={isStreaming}
                  value={streamText}
                />
              ) : (
                <p className="stream-placeholder">Choose a mode, then run the stream.</p>
              )}
            </div>
            <div className="stream-metrics">
              <div>
                <span>Live {streamUnitLabel[granularity]} wrappers · cap {maxAnimatedItems}</span>
                <strong>{streamText ? liveWrappers : '—'}</strong>
              </div>
              <div>
                <span>Max start lag</span>
                <strong>{textMaxLag}ms</strong>
              </div>
              <div>
                <span>Stream state</span>
                <strong>{isStreaming ? 'Receiving' : streamText ? 'Settled' : 'Ready'}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <RevealTextApiReference />

      <section className="studio group-studio" id="group-demo" aria-labelledby="group-studio-title">
        <div className="section-intro">
          <p className="eyebrow">REVEALGROUP / INTERACTIVE STUDIO</p>
          <h2 id="group-studio-title">Tune the sequence. Insert real UI.</h2>
          <p>
            The same scheduler reveals newly inserted keyed React children. Change the entrance,
            then run a mixed burst to compare different UI blocks in one live feed.
          </p>
        </div>

        <div className="studio-grid">
          <aside className="control-deck group-control-deck" aria-label="RevealGroup controls">
            <div className="group-effect-picker">
              <span className="control-label">Effect</span>
              <div className="stage-effect-picker group-effect-options" role="group" aria-label="RevealGroup effect">
                {previewEffects.map((preset) => (
                  <button
                    aria-label={preset.label}
                    aria-pressed={groupEffect === preset.value}
                    className={`effect-icon-button${groupEffect === preset.value ? ' is-active' : ''}`}
                    key={preset.value}
                    onClick={() => setGroupPreset(preset.value)}
                    title={preset.label}
                    type="button"
                  >
                    {preset.value === 'scale' ? (
                      <svg className="scale-effect-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />
                      </svg>
                    ) : preset.icon}
                  </button>
                ))}
              </div>
            </div>
            <label>
              Duration <output>{groupDuration}ms</output>
              <input
                max="3000"
                min="160"
                onChange={(event) => {
                  setGroupDuration(Number(event.target.value))
                  replayGroup()
                }}
                step="20"
                type="range"
                value={groupDuration}
              />
            </label>
            <label>
              Interval <output>{groupInterval}ms</output>
              <input
                max="1000"
                min="0"
                onChange={(event) => {
                  setGroupInterval(Number(event.target.value))
                  replayGroup()
                }}
                step="20"
                type="range"
                value={groupInterval}
              />
            </label>
            <div className="stream-actions">
              {showActivityActions ? (
                <button
                  className={`button primary${areActivityActionsExiting ? ` is-exiting exit-${groupEffect}` : ''}`}
                  disabled={areActivityActionsExiting}
                  onAnimationEnd={finalizeActivityActionsExit}
                  onClick={runMixedBurst}
                  type="button"
                >
                  Run mixed burst
                </button>
              ) : null}
              <button className="button ghost" onClick={replayGroup} type="button">
                Replay group feed
              </button>
            </div>
            <pre className="code-card group-api-code" aria-label="Current RevealGroup API example"><code>{groupCode}</code></pre>
          </aside>

          <article className="stream-card group-stream-card" aria-label="Live group output">
            <div className="card-topline">
              <span className="signal"><i />LIVE GROUP</span>
              <span>KEYED / INCREMENTAL</span>
            </div>
            <RevealGroup
              className="activity-feed"
              duration={groupDuration}
              effect={groupEffect}
              interval={groupInterval}
              maxLag={groupMaxLag}
              onSettled={() => setIsGroupAnimating(false)}
              itemClassName="activity-reveal"
              key={groupRun}
            >
              {cards.map((card) => {
                const isExiting = exitingCardIds.includes(card.id)

                return (
                  <article
                    className={`activity-card activity-${card.kind}${isExiting ? ` is-exiting exit-${groupEffect}` : ''}`}
                    key={card.id}
                    onAnimationEnd={() => {
                      if (isExiting) finalizeCardRemoval(card.id)
                    }}
                  >
                    <span className="activity-marker" aria-hidden="true">
                      {card.kind === 'message' ? 'M' : card.kind === 'status' ? '✓' : card.kind === 'assignee' ? 'MC' : '!'}
                    </span>
                    <div className="activity-card-copy">
                      <span>{card.kind}</span>
                      <strong>{card.label}</strong>
                      <p>{card.detail}</p>
                    </div>
                    <button
                      aria-label={`Remove ${card.label}`}
                      className="event-remove"
                      disabled={isExiting}
                      onClick={() => removeCard(card.id)}
                      type="button"
                    >
                      <svg className="close-icon" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="m4 4 8 8M12 4l-8 8" />
                      </svg>
                    </button>
                  </article>
                )
              })}
            </RevealGroup>
            <div className="stream-metrics">
              <div>
                <span>Visible children</span>
                <strong>{cards.length} / {maxActivityCards}</strong>
              </div>
              <div>
                <span>Interval</span>
                <strong>{groupInterval}ms</strong>
              </div>
              <div>
                <span>Group state</span>
                <strong>{isGroupAnimating ? 'Animating' : cards.length === maxActivityCards ? 'Full' : 'Ready'}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <RevealGroupApiReference />

      <footer className="footer">
        <span>React 18 / 19</span>
        <span>Web Animations API</span>
        <span>Intl.Segmenter</span>
        <span>Zero runtime dependencies</span>
      </footer>
    </main>
  )
}
