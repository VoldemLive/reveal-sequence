import {
  createElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  getBoundedCompactionEnd,
  normalizeCompactionEnd,
  selectionBelongsTo,
  type CompactionCursor,
} from './core/compaction'
import { reconcileText, type TextReconcileState } from './core/reconcileText'
import { RevealUnit } from './RevealUnit'
import type { RevealTextProps, RevealUnitPhase, TextUnit } from './types'
import { useHydrated } from './useHydrated'
import { useRevealScheduler } from './useRevealScheduler'
import { useRevealTrigger } from './useRevealTrigger'

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const SELECTION_SAFETY_TIMEOUT = 1500

interface LatestTextState {
  generation: number
  maxAnimatedItems: number
  streaming: boolean
  units: TextUnit[]
  value: string
}

export function RevealText({
  active: controlledActive = true,
  as: Root = 'span',
  by = 'word',
  className,
  duration = 420,
  effect = 'fade-up',
  interval = 42,
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
  const { active, rootRef } = useRevealTrigger(trigger, controlledActive)
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
  const [, setCompactionVersion] = useState(0)

  if (phaseGenerationRef.current !== generation) {
    phaseGenerationRef.current = generation
    phasesRef.current.clear()
    compactionRef.current = { end: 0, generation }
  }

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

  const pendingIds = !hydrated
    ? new Set<string>()
    : mode === 'once'
      ? initialAnimationPendingRef.current
        ? initialAnimationIdsRef.current
        : new Set<string>()
      : reconciliation.newUnitIds
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
  })

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
  const prefixEnd = normalizeCompactionEnd(reconciliation.state.units, requestedPrefixEnd)
  const renderedUnits = reconciliation.state.units.filter(({ end }) => end > prefixEnd)

  return createElement(
    Root,
    {
      'aria-label': value,
      className,
      ref: rootRef,
      style,
    },
    prefixEnd > 0 ? value.slice(0, prefixEnd) : null,
    renderedUnits.map((unit) => {
      if (!unit.animated) return unit.text
      return (
        <RevealUnit
          active={active}
          as="span"
          duration={duration}
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
}
