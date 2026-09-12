import {
  createElement,
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  getBoundedCompactionEnd,
  getOverflowCompactionEnd,
  normalizeCompactionEnd,
  selectionBelongsTo,
  type CompactionCursor,
} from './core/compaction'
import { reconcileText, type TextReconcileState } from './core/reconcileText'
import { RevealUnit } from './RevealUnit'
import type { RevealAnnouncement, RevealTextProps, RevealUnitPhase, TextUnit } from './types'
import { useHydrated } from './useHydrated'
import { useRevealScheduler } from './useRevealScheduler'
import { useRevealTrigger } from './useRevealTrigger'

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const SELECTION_SAFETY_TIMEOUT = 1500
const COMPLETED_SENTENCE_PATTERN = /[^.!?]+[.!?]+(?=\s|$)/g
const liveRegionStyle = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  margin: -1,
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1,
} as const

interface LatestTextState {
  generation: number
  maxAnimatedItems: number
  streaming: boolean
  units: TextUnit[]
  value: string
}

export function RevealText({
  active: controlledActive = true,
  announce = 'off',
  as: Root = 'span',
  by = 'word',
  className,
  duration = 420,
  easing = 'cubic-bezier(0.22, 1, 0.36, 1)',
  effect = 'fade-up',
  interval = 42,
  inView,
  locale,
  maxAnimatedItems = 48,
  maxLag = 240,
  mode = 'append',
  onComplete,
  onSettled,
  streaming = false,
  style,
  trigger = 'mount',
  value,
}: RevealTextProps) {
  const committedStateRef = useRef<TextReconcileState | null>(null)
  const previousState = committedStateRef.current
  const reconciliation = reconcileText(previousState, value, by, locale)
  const generation = reconciliation.state.generation
  const { active, rootRef } = useRevealTrigger(trigger, controlledActive, inView)
  const hydrated = useHydrated()
  const phasesRef = useRef(new Map<string, RevealUnitPhase>())
  const phaseGenerationRef = useRef(generation)
  const compactionRef = useRef<CompactionCursor>({ end: 0, generation })
  const latestRef = useRef<LatestTextState>({
    generation,
    maxAnimatedItems,
    streaming,
    units: reconciliation.state.units,
    value,
  })
  const schedulerIdleRef = useRef(true)
  const notifiedGenerationsRef = useRef(new Set<number>())
  const initialAnimationIdsRef = useRef(new Set<string>())
  const initialAnimationPendingRef = useRef(mode === 'once')
  const compactionTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingFinalRef = useRef(false)
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const selectionHandlerRef = useRef<(() => void) | undefined>(undefined)
  const runCompactionRef = useRef<(finalRequested: boolean) => void>(() => undefined)
  const [compactionVersion, setCompactionVersion] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const sentenceStateRef = useRef<
    { generation: number; mode: RevealAnnouncement; start: number } | undefined
  >(undefined)
  const completeAnnouncementPendingRef = useRef(streaming)

  if (phaseGenerationRef.current !== generation) {
    phaseGenerationRef.current = generation
    phasesRef.current.clear()
    compactionRef.current = { end: 0, generation }
  }

  if (streaming) completeAnnouncementPendingRef.current = true

  latestRef.current = {
    generation,
    maxAnimatedItems,
    streaming,
    units: reconciliation.state.units,
    value,
  }

  if (previousState === null && reconciliation.kind === 'initial') {
    initialAnimationIdsRef.current = reconciliation.newUnitIds
  }

  const selection =
    typeof window === 'undefined' || typeof window.getSelection !== 'function'
      ? null
      : window.getSelection()
  const queueOverflowEnd = selectionBelongsTo(rootRef.current, selection)
    ? 0
    : getOverflowCompactionEnd(reconciliation.state.units, maxAnimatedItems)
  const candidatePendingIds = !hydrated
    ? new Set<string>()
    : mode === 'once'
      ? initialAnimationPendingRef.current
        ? initialAnimationIdsRef.current
        : new Set<string>()
      : reconciliation.newUnitIds
  const pendingIds = new Set(
    [...candidatePendingIds].filter((id) => {
      const unit = reconciliation.state.units.find((candidate) => candidate.id === id)
      return unit !== undefined && unit.end > queueOverflowEnd
    }),
  )
  if (pendingIds.size > 0) schedulerIdleRef.current = false

  const updateCompaction = useCallback((next: CompactionCursor) => {
    const current = compactionRef.current
    if (current.generation === next.generation && current.end === next.end) return
    compactionRef.current = next
    setCompactionVersion((version) => version + 1)
  }, [])

  const clearSelectionWait = useCallback(() => {
    if (selectionHandlerRef.current && typeof document !== 'undefined') {
      document.removeEventListener('selectionchange', selectionHandlerRef.current)
    }
    selectionHandlerRef.current = undefined
    if (selectionTimerRef.current !== undefined) clearTimeout(selectionTimerRef.current)
    selectionTimerRef.current = undefined
  }, [])

  const queueCompaction = useCallback((finalRequested: boolean) => {
    pendingFinalRef.current ||= finalRequested
    if (compactionTimerRef.current !== undefined) return

    compactionTimerRef.current = setTimeout(() => {
      compactionTimerRef.current = undefined
      const shouldFinalize = pendingFinalRef.current
      pendingFinalRef.current = false
      runCompactionRef.current(shouldFinalize)
    }, 0)
  }, [])

  const runCompaction = useCallback(
    (finalRequested: boolean) => {
      const latest = latestRef.current
      const currentEnd =
        compactionRef.current.generation === latest.generation ? compactionRef.current.end : 0

      if (finalRequested && !latest.streaming && schedulerIdleRef.current) {
        const selection =
          typeof window === 'undefined' || typeof window.getSelection !== 'function'
            ? null
            : window.getSelection()

        if (selectionBelongsTo(rootRef.current, selection)) {
          if (selectionHandlerRef.current) return

          const handleSelectionChange = () => {
            const currentSelection = window.getSelection()
            if (selectionBelongsTo(rootRef.current, currentSelection)) return
            clearSelectionWait()
            queueCompaction(true)
          }

          selectionHandlerRef.current = handleSelectionChange
          document.addEventListener('selectionchange', handleSelectionChange)
          selectionTimerRef.current = setTimeout(() => {
            clearSelectionWait()
            const current = latestRef.current
            if (!current.streaming && schedulerIdleRef.current) {
              phasesRef.current.clear()
              updateCompaction({ end: current.value.length, generation: current.generation })
            }
          }, SELECTION_SAFETY_TIMEOUT)
          return
        }

        clearSelectionWait()
        phasesRef.current.clear()
        updateCompaction({ end: latest.value.length, generation: latest.generation })
        return
      }

      const nextEnd = getBoundedCompactionEnd(
        latest.units,
        currentEnd,
        latest.maxAnimatedItems,
        phasesRef.current,
      )
      for (const unit of latest.units) {
        if (unit.end <= nextEnd) phasesRef.current.delete(unit.id)
      }
      updateCompaction({ end: nextEnd, generation: latest.generation })
    },
    [clearSelectionWait, queueCompaction, rootRef, updateCompaction],
  )
  runCompactionRef.current = runCompaction

  const handlePhaseChange = useCallback(
    (id: string, phase: RevealUnitPhase) => {
      phasesRef.current.set(id, phase)
      if (phase === 'settled') queueCompaction(false)
    },
    [queueCompaction],
  )

  const handleSchedulerIdle = useCallback(() => {
    schedulerIdleRef.current = true
    queueCompaction(!latestRef.current.streaming)
  }, [queueCompaction])

  const { release, schedule } = useRevealScheduler({
    interval,
    maxLag,
    onIdle: handleSchedulerIdle,
  })

  useBrowserLayoutEffect(() => {
    committedStateRef.current = reconciliation.state

    if (!hydrated && mode === 'append') {
      compactionRef.current = { end: value.length, generation }
      return
    }

    if (hydrated) initialAnimationPendingRef.current = false
    if (hydrated && !streaming && schedulerIdleRef.current) queueCompaction(true)
  }, [generation, hydrated, mode, queueCompaction, reconciliation.state, streaming, value])

  useEffect(() => {
    if (!hydrated || announce !== 'sentence') {
      sentenceStateRef.current = undefined
      return
    }

    const previous = sentenceStateRef.current
    if (previous?.generation !== generation || previous.mode !== announce) {
      sentenceStateRef.current = { generation, mode: announce, start: value.length }
      return
    }

    if (!streaming || value.length <= previous.start) return

    const appended = value.slice(previous.start)
    const completedSentences: string[] = []
    let consumed = 0

    for (const match of appended.matchAll(COMPLETED_SENTENCE_PATTERN)) {
      const sentence = match[0].trim()
      if (sentence) completedSentences.push(sentence)
      consumed = (match.index ?? 0) + match[0].length
    }

    if (consumed === 0) return

    previous.start += consumed
    setAnnouncement(completedSentences.join(' '))
  }, [announce, generation, hydrated, streaming, value])

  useEffect(() => {
    const cursor = compactionRef.current
    if (
      announce !== 'complete' ||
      !completeAnnouncementPendingRef.current ||
      !hydrated ||
      streaming ||
      !schedulerIdleRef.current ||
      cursor.generation !== generation ||
      cursor.end < value.length
    ) {
      return
    }

    completeAnnouncementPendingRef.current = false
    setAnnouncement(value)
  }, [announce, compactionVersion, generation, hydrated, streaming, value])

  useEffect(() => {
    const cursor = compactionRef.current
    if (
      !hydrated ||
      streaming ||
      !schedulerIdleRef.current ||
      cursor.generation !== generation ||
      cursor.end < value.length ||
      notifiedGenerationsRef.current.has(generation)
    ) {
      return
    }

    notifiedGenerationsRef.current.add(generation)
    onSettled?.()
    if (onComplete !== onSettled) onComplete?.()
  }, [compactionVersion, generation, hydrated, onComplete, onSettled, streaming, value])

  useEffect(
    () => () => {
      if (compactionTimerRef.current !== undefined) clearTimeout(compactionTimerRef.current)
      clearSelectionWait()
    },
    [clearSelectionWait],
  )

  if (!hydrated) {
    return createElement(
      Root,
      {
        'aria-label': value,
        className,
        ref: rootRef,
        style,
      },
      value,
    )
  }

  const requestedPrefixEnd =
    compactionRef.current.generation === generation ? compactionRef.current.end : 0
  const prefixEnd = normalizeCompactionEnd(
    reconciliation.state.units,
    Math.max(requestedPrefixEnd, queueOverflowEnd),
  )
  const renderedUnits = reconciliation.state.units.filter(({ end }) => end > prefixEnd)

  const root = createElement(
    Root,
    {
      'aria-label': value,
      className,
      ref: rootRef,
      style,
    },
    prefixEnd > 0 ? (
      <Fragment key={`prefix:${generation}:${prefixEnd}`}>{value.slice(0, prefixEnd)}</Fragment>
    ) : null,
    renderedUnits.map((unit) => {
      if (!unit.animated) return <Fragment key={unit.id}>{unit.text}</Fragment>
      return (
        <RevealUnit
          active={active}
          as="span"
          duration={duration}
          easing={easing}
          effect={effect}
          hiddenFromAssistiveTech
          key={unit.id}
          onPhaseChange={handlePhaseChange}
          pending={pendingIds.has(unit.id)}
          release={release}
          schedule={schedule}
          unitId={unit.id}
        >
          {unit.text}
        </RevealUnit>
      )
    }),
  )

  if (announce === 'off') return root

  return createElement(
    Fragment,
    null,
    root,
    createElement(
      'span',
      {
        'aria-atomic': true,
        'aria-live': 'polite',
        role: 'status',
        style: liveRegionStyle,
      },
      announcement,
    ),
  )
}
