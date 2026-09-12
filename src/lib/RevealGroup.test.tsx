import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RevealGroup } from './RevealGroup'

describe('RevealGroup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(Element.prototype.animate).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('animates only newly inserted keyed children', async () => {
    const { rerender } = render(
      <RevealGroup interval={0}>
        <span key="one">One</span>
        <span key="two">Two</span>
      </RevealGroup>,
    )
    await act(() => vi.runAllTimersAsync())
    expect(Element.prototype.animate).toHaveBeenCalledTimes(2)

    rerender(
      <RevealGroup interval={0}>
        <span key="one">One</span>
        <span key="two">Two</span>
        <span key="three">Three</span>
      </RevealGroup>,
    )
    await act(() => vi.runAllTimersAsync())
    expect(Element.prototype.animate).toHaveBeenCalledTimes(3)
  })

  it('uses updated timing for keyed children that are still waiting to start', async () => {
    const { rerender } = render(
      <RevealGroup duration={120} interval={200}>
        <span key="one">One</span>
      </RevealGroup>,
    )

    rerender(
      <RevealGroup duration={120} interval={200}>
        <span key="one">One</span>
        <span key="two">Two</span>
      </RevealGroup>,
    )
    rerender(
      <RevealGroup duration={720} interval={200}>
        <span key="one">One</span>
        <span key="two">Two</span>
      </RevealGroup>,
    )
    await act(() => vi.runAllTimersAsync())

    expect(Element.prototype.animate).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.objectContaining({ duration: 720 }),
    )
  })

  it('treats a removed and re-added key as a new insertion', async () => {
    const { rerender } = render(
      <RevealGroup interval={0}>
        <span key="one">One</span>
        <span key="two">Two</span>
      </RevealGroup>,
    )
    await act(() => vi.runAllTimersAsync())

    rerender(
      <RevealGroup interval={0}>
        <span key="one">One</span>
      </RevealGroup>,
    )
    rerender(
      <RevealGroup interval={0}>
        <span key="one">One</span>
        <span key="two">Two</span>
      </RevealGroup>,
    )
    await act(() => vi.runAllTimersAsync())

    expect(Element.prototype.animate).toHaveBeenCalledTimes(3)
  })
})
