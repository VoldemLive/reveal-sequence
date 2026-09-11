import { describe, expect, it } from 'vitest'
import { segmentTextUnits } from '../segment'
import {
  getBoundedCompactionEnd,
  getOverflowCompactionEnd,
  normalizeCompactionEnd,
} from './compaction'

describe('text compaction', () => {
  it('compacts overflow before queued units create wrappers', () => {
    const value = 'one two three four'
    const units = segmentTextUnits(value, 'word', 0)

    expect(value.slice(0, getOverflowCompactionEnd(units, 2))).toBe('one two ')
  })

  it('compacts only the settled overflow and its following separator', () => {
    const units = segmentTextUnits('one two three', 'word', 0)
    const phases = new Map(
      units.filter(({ animated }) => animated).map(({ id }) => [id, 'settled'] as const),
    )

    const end = getBoundedCompactionEnd(units, 0, 2, phases)
    expect('one two three'.slice(0, end)).toBe('one ')
  })

  it('stops before a pending unit', () => {
    const units = segmentTextUnits('one two three', 'word', 0)
    const phases = new Map([[units[0].id, 'pending'] as const])

    expect(getBoundedCompactionEnd(units, 0, 1, phases)).toBe(0)
  })

  it('does not compact an incomplete final word during streaming', () => {
    const units = segmentTextUnits('Stream', 'word', 0)
    const phases = new Map([[units[0].id, 'settled'] as const])

    expect(getBoundedCompactionEnd(units, 0, 0, phases)).toBe(0)
  })

  it('backs up a stale cursor when an appended chunk extends its unit', () => {
    const units = segmentTextUnits('Streaming', 'word', 0)
    expect(normalizeCompactionEnd(units, 'Stream'.length)).toBe(0)
  })
})
