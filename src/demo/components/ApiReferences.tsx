export function RevealTextApiReference() {
  return (
    <section className="api-reference" id="text-api" aria-labelledby="reveal-text-api-title">
      <div className="api-reference-heading">
        <div>
          <p className="eyebrow">API REFERENCE / REVEALTEXT</p>
          <h2 id="reveal-text-api-title">Append-aware text, with an explicit runtime budget.</h2>
          <p>Use a string value for content that arrives incrementally. Stable content stays plain text; only the newly reconciled tail receives wrappers and motion.</p>
        </div>
        <pre className="api-signature"><code>{'<RevealText value={text} by="word" mode="append" />'}</code></pre>
      </div>
      <div className="api-doc-grid">
        <article className="api-doc-card">
          <h3>Content and segmentation</h3>
          <dl>
            <div><dt><code>value</code><span>string · required</span></dt><dd>The current text value. Appended content is reconciled without replaying the stable prefix.</dd></div>
            <div><dt><code>by</code><span>word · default</span></dt><dd><code>grapheme</code>, <code>word</code>, <code>sentence</code>, or <code>paragraph</code>. Pair with <code>locale</code> for language-aware segmentation.</dd></div>
            <div><dt><code>mode</code><span>append · default</span></dt><dd><code>append</code> animates incoming units; <code>once</code> animates only the initial value.</dd></div>
            <div><dt><code>streaming</code><span>false · default</span></dt><dd>Keep the tail live while data is arriving; final DOM compaction waits for the stream to settle.</dd></div>
          </dl>
        </article>
        <article className="api-doc-card">
          <h3>Scheduling and lifecycle</h3>
          <dl>
            <div><dt><code>effect</code> <code>duration</code> <code>easing</code><span>motion</span></dt><dd>Seven presets or custom keyframes. Duration defaults to 420ms.</dd></div>
            <div><dt><code>interval</code> <code>maxLag</code><span>42ms · 240ms</span></dt><dd>The scheduler spaces starts, then compresses the queue before the lag budget is exceeded.</dd></div>
            <div><dt><code>maxAnimatedItems</code><span>48 · default</span></dt><dd>A hard cap on live animation wrappers. Older units return to ordinary text.</dd></div>
            <div><dt><code>trigger</code> <code>active</code> <code>inView</code><span>mount · default</span></dt><dd>Run on mount, visibility, or an explicit controlled boolean.</dd></div>
            <div><dt><code>announce</code> <code>onSettled</code><span>a11y and callbacks</span></dt><dd>Optional polite announcements; lifecycle callbacks fire after the current generation settles.</dd></div>
          </dl>
        </article>
      </div>
    </section>
  )
}

export function RevealGroupApiReference() {
  return (
    <section className="api-reference group-api-reference" id="group-api" aria-labelledby="reveal-group-api-title">
      <div className="api-reference-heading">
        <div>
          <p className="eyebrow">API REFERENCE / REVEALGROUP</p>
          <h2 id="reveal-group-api-title">Sequence incoming React children by key.</h2>
          <p>Use the same scheduler for heterogeneous UI. Existing keys remain inert; only newly inserted keyed children enter the sequence.</p>
        </div>
        <pre className="api-signature"><code>{'<RevealGroup>{keyedChildren}</RevealGroup>'}</code></pre>
      </div>
      <div className="api-doc-grid">
        <article className="api-doc-card">
          <h3>Identity and structure</h3>
          <dl>
            <div><dt><code>children</code><span>ReactNode · required</span></dt><dd>Pass keyed React children. New keys are scheduled; keys already seen preserve their rendered state.</dd></div>
            <div><dt><code>as</code><span>div · default</span></dt><dd>Root element for the group.</dd></div>
            <div><dt><code>itemAs</code> <code>itemClassName</code><span>div · default</span></dt><dd>Choose the wrapper element and styling applied to each scheduled child.</dd></div>
            <div><dt><code>className</code> <code>style</code><span>styling</span></dt><dd>Applied to the root without imposing a layout system.</dd></div>
          </dl>
        </article>
        <article className="api-doc-card">
          <h3>Shared scheduling contract</h3>
          <dl>
            <div><dt><code>effect</code> <code>duration</code> <code>easing</code><span>motion</span></dt><dd>The same preset or custom keyframes model as <code>RevealText</code>. Duration defaults to 420ms.</dd></div>
            <div><dt><code>interval</code> <code>maxLag</code><span>70ms · 280ms</span></dt><dd>Starts are paced by interval; the scheduler compresses a burst to respect the lag budget.</dd></div>
            <div><dt><code>trigger</code> <code>active</code> <code>inView</code><span>mount · default</span></dt><dd>Use mount, in-view, or controlled activation for the group.</dd></div>
            <div><dt><code>onSettled</code><span>callback</span></dt><dd>Called after pending keyed children complete and the scheduler becomes idle.</dd></div>
          </dl>
        </article>
      </div>
    </section>
  )
}
