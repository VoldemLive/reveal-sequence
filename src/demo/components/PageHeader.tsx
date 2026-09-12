import { RevealText, type RevealPresetEffect } from '../../lib'
import { previewEffects } from '../model'

type PageHeaderProps = {
  effect: RevealPresetEffect
  isInstallCommandCopied: boolean
  onCopyInstallCommand: () => void
  onSelectEffect: (effect: RevealPresetEffect) => void
  onScrollToTop: () => void
  staticRun: number
  duration: number
}

export function PageHeader({
  duration,
  effect,
  isInstallCommandCopied,
  onCopyInstallCommand,
  onScrollToTop,
  onSelectEffect,
  staticRun,
}: PageHeaderProps) {
  return (
    <>
      <nav className="topbar" aria-label="Reveal Sequence">
        <a className="wordmark" href="#top" aria-label="Reveal Sequence home" onClick={(event) => { event.preventDefault(); onScrollToTop() }}>
          reveal<span>sequence</span>
        </a>
        <div className="topbar-meta">
          <span>React primitive</span>
          <a className="github-link" href="https://github.com/VoldemLive/reveal-sequence">GitHub ↗</a>
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
          <div className="hero-quickstart" aria-label="Quick start">
            <div className="install-command">
              <code>npm install reveal-sequence</code>
              <button
                aria-label={isInstallCommandCopied ? 'Installation command copied' : 'Copy installation command'}
                aria-live="polite"
                className="install-copy"
                onClick={onCopyInstallCommand}
                title={isInstallCommandCopied ? 'Copied' : 'Copy installation command'}
                type="button"
              >
                {isInstallCommandCopied ? (
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="m3.5 8.25 2.7 2.7 6.3-6.3" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="5.5" y="2.5" width="7" height="9" rx="1.25" />
                    <path d="M3.5 5.5v6.75c0 .69.56 1.25 1.25 1.25h5.75" />
                  </svg>
                )}
              </button>
            </div>
            <span className="quickstart-arrow" aria-hidden="true">→</span>
            <code className="hero-usage">{'<RevealText value={message} streaming={isStreaming} />'}</code>
          </div>
          <p className="hero-quickstart-note">Append-aware by default. Stable content does not replay.</p>
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
                  onClick={() => onSelectEffect(preset.value)}
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
            duration={Math.max(duration, 1_300)}
            effect={effect}
            interval={180}
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

      <section className="product-facts" aria-label="Key capabilities">
        <article>
          <strong>5.1 kB gzip</strong>
          <span>Tree-shakeable ESM</span>
        </article>
        <article>
          <strong>0 runtime dependencies</strong>
          <span>React 18 / 19 as peers</span>
        </article>
        <article>
          <strong>Text + keyed UI</strong>
          <span>SSR-safe, reduced-motion aware</span>
        </article>
      </section>
    </>
  )
}
