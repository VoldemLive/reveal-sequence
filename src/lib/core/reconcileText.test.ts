import { describe, expect, it } from 'vitest'
import { reconcileText } from './reconcileText'

describe('reconcileText', () => {
  it('marks every content unit as new on the initial value', () => {
    const result = reconcileText(null, 'Hello world', 'word')

    expect(result.kind).toBe('initial')
    expect(result.newUnitIds.size).toBe(2)
  })

  it('preserves the identity of a final word while it is extended', () => {
    const initial = reconcileText(null, 'Stream', 'word')
    const appended = reconcileText(initial.state, 'Streaming', 'word')

    expect(initial.state.units[0].complete).toBe(false)
    expect(appended.state.units[0].id).toBe(initial.state.units[0].id)
    expect(appended.newUnitIds.size).toBe(0)
  })

  it('marks only a newly appended word as new', () => {
    const initial = reconcileText(null, 'Streaming', 'word')
    const appended = reconcileText(initial.state, 'Streaming text', 'word')
    const newUnits = appended.state.units.filter(({ id }) => appended.newUnitIds.has(id))

    expect(appended.kind).toBe('append')
    expect(newUnits.map(({ text }) => text)).toEqual(['text'])
  })

  it('returns the committed state for an unchanged value', () => {
    const initial = reconcileText(null, 'No change', 'word')
    const unchanged = reconcileText(initial.state, 'No change', 'word')

    expect(unchanged.kind).toBe('unchanged')
    expect(unchanged.state).toBe(initial.state)
    expect(unchanged.newUnitIds.size).toBe(0)
  })

  it('preserves a complete common prefix but does not animate a rewrite', () => {
    const initial = reconcileText(null, 'Hello world', 'word')
    const rewritten = reconcileText(initial.state, 'Hello there', 'word')

    expect(rewritten.kind).toBe('rewrite')
    expect(rewritten.state.units[0].id).toBe(initial.state.units[0].id)
    expect(rewritten.state.units.at(-1)?.id).not.toBe(initial.state.units.at(-1)?.id)
    expect(rewritten.newUnitIds.size).toBe(0)
  })

  it('starts a fresh generation after reset', () => {
    const initial = reconcileText(null, 'First stream', 'word')
    const reset = reconcileText(initial.state, '', 'word')
    const restarted = reconcileText(reset.state, 'First', 'word')

    expect(reset.state.generation).toBe(1)
    expect(restarted.state.units[0].id).toMatch(/^1:/)
    expect(restarted.newUnitIds.size).toBe(1)
  })
})
