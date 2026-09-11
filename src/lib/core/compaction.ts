import type { RevealUnitPhase, TextUnit } from '../types'

export interface CompactionCursor {
  end: number
  generation: number
}

export function normalizeCompactionEnd(
  units: TextUnit[],
  requestedEnd: number,
): number {
  const boundedEnd = Math.max(0, requestedEnd)
  const overlappingUnit = units.find(
    ({ end, start }) => start < boundedEnd && end > boundedEnd,
  )
  return overlappingUnit?.start ?? boundedEnd
}

export function getOverflowCompactionEnd(
  units: TextUnit[],
  maxAnimatedItems: number,
): number {
  const overflow = Math.max(
    0,
    units.filter(({ animated }) => animated).length - Math.max(0, maxAnimatedItems),
  )
  if (overflow === 0) return 0

  let compactedContent = 0
  let nextEnd = 0

  for (const unit of units) {
    if (unit.animated && compactedContent >= overflow) break
    nextEnd = unit.end
    if (unit.animated) compactedContent += 1
  }

  return nextEnd
}

export function getBoundedCompactionEnd(
  units: TextUnit[],
  currentEnd: number,
  maxAnimatedItems: number,
  phases: ReadonlyMap<string, RevealUnitPhase>,
): number {
  const liveUnits = units.filter(({ animated, end }) => animated && end > currentEnd)
  const overflow = Math.max(0, liveUnits.length - Math.max(0, maxAnimatedItems))
  if (overflow === 0) return currentEnd

  let compactedContent = 0
  let nextEnd = currentEnd

  for (const unit of units) {
    if (unit.end <= currentEnd) continue
    if (unit.start < currentEnd) break
    if (unit.animated && compactedContent >= overflow) break

    if (unit.animated) {
      const phase = phases.get(unit.id) ?? 'settled'
      if (phase !== 'settled' || !unit.complete) break
      compactedContent += 1
    }

    nextEnd = unit.end
  }

  return nextEnd
}

export function selectionBelongsTo(
  root: HTMLElement | null,
  selection: Selection | null,
): boolean {
  if (!root || !selection || selection.isCollapsed) return false
  return (
    (selection.anchorNode !== null && root.contains(selection.anchorNode)) ||
    (selection.focusNode !== null && root.contains(selection.focusNode))
  )
}
