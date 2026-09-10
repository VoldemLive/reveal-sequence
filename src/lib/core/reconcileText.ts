import { segmentTextUnits } from '../segment'
import type { RevealGranularity, TextUnit } from '../types'

export type TextUpdateKind = 'initial' | 'append' | 'unchanged' | 'rewrite'

export interface TextReconcileState {
  configKey: string
  generation: number
  units: TextUnit[]
  value: string
}

export interface TextReconcileResult {
  kind: TextUpdateKind
  newUnitIds: Set<string>
  state: TextReconcileState
}

function configurationKey(granularity: RevealGranularity, locale?: string | string[]): string {
  return `${granularity}:${JSON.stringify(locale ?? null)}`
}

export function longestCommonPrefix(left: string, right: string): number {
  const limit = Math.min(left.length, right.length)
  let index = 0
  while (index < limit && left[index] === right[index]) index += 1
  return index
}

function animatedIds(units: TextUnit[]): Set<string> {
  return new Set(units.filter(({ animated }) => animated).map(({ id }) => id))
}

export function reconcileText(
  previous: TextReconcileState | null,
  value: string,
  granularity: RevealGranularity,
  locale?: string | string[],
): TextReconcileResult {
  const configKey = configurationKey(granularity, locale)

  if (!previous) {
    const units = segmentTextUnits(value, granularity, 0, locale)
    return {
      kind: 'initial',
      newUnitIds: animatedIds(units),
      state: { configKey, generation: 0, units, value },
    }
  }

  if (previous.value === value && previous.configKey === configKey) {
    return { kind: 'unchanged', newUnitIds: new Set(), state: previous }
  }

  if (value.startsWith(previous.value) && previous.configKey === configKey) {
    const units = segmentTextUnits(value, granularity, previous.generation, locale)
    const previousIds = new Set(previous.units.map(({ id }) => id))

    return {
      kind: 'append',
      newUnitIds: new Set(
        units
          .filter(({ animated, id }) => animated && !previousIds.has(id))
          .map(({ id }) => id),
      ),
      state: { configKey, generation: previous.generation, units, value },
    }
  }

  const generation = previous.generation + 1
  const prefixEnd =
    previous.configKey === configKey ? longestCommonPrefix(previous.value, value) : 0
  const previousByRange = new Map(
    previous.units.map((unit) => [`${unit.start}:${unit.end}:${unit.kind}:${unit.text}`, unit]),
  )
  const units = segmentTextUnits(value, granularity, generation, locale).map((unit) => {
    if (unit.end > prefixEnd) return unit
    return previousByRange.get(`${unit.start}:${unit.end}:${unit.kind}:${unit.text}`) ?? unit
  })

  return {
    kind: 'rewrite',
    newUnitIds: new Set(),
    state: { configKey, generation, units, value },
  }
}
