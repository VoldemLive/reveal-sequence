import { StrictMode } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RevealText } from './RevealText'

describe('RevealText', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(Element.prototype.animate).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exposes the full sentence to assistive technology', () => {
    const { getByLabelText } = render(<RevealText value="Hello world" />)
    expect(getByLabelText('Hello world')).toBeTruthy()
  })

  it('does not create a live region unless announcements are requested', () => {
    const { queryByRole } = render(<RevealText value="Silent by default" />)
    expect(queryByRole('status')).toBeNull()
  })

  it('announces only completed sentences from newly streamed text', async () => {
    const { container, rerender } = render(
      <RevealText announce="sentence" interval={0} streaming value="" />,
    )
    await act(() => vi.runAllTimersAsync())
    expect(container.querySelector('[role="status"]')?.textContent).toBe('')

    rerender(<RevealText announce="sentence" interval={0} streaming value="First sentence." />)
    await act(() => vi.runAllTimersAsync())
    expect(container.querySelector('[role="status"]')?.textContent).toBe('First sentence.')

    rerender(
      <RevealText
        announce="sentence"
        interval={0}
        streaming
        value="First sentence. Second sentence."
      />,
    )
    await act(() => vi.runAllTimersAsync())
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Second sentence.')
  })

  it('announces the settled value only after a stream completes', async () => {
    const { container, rerender } = render(
      <RevealText announce="complete" interval={0} streaming value="Draft" />,
    )
    await act(() => vi.runAllTimersAsync())
    expect(container.querySelector('[role="status"]')?.textContent).toBe('')

    rerender(
      <RevealText announce="complete" interval={0} streaming={false} value="Draft complete." />,
    )
    await act(() => vi.runAllTimersAsync())
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Draft complete.')
  })

  it('animates only newly appended segments after the first render', async () => {
    const { rerender } = render(<RevealText interval={0} value="Hello world" />)
    await act(() => vi.runAllTimersAsync())
    const initialCalls = vi.mocked(Element.prototype.animate).mock.calls.length
    expect(initialCalls).toBe(2)

    rerender(<RevealText interval={0} value="Hello world again" />)
    await act(() => vi.runAllTimersAsync())
    const appendedCalls = vi.mocked(Element.prototype.animate).mock.calls.length - initialCalls
    expect(appendedCalls).toBe(1)
  })

  it('does not animate when reduced motion is enabled', async () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
    } as MediaQueryList)

    render(<RevealText interval={0} value="No motion" />)
    await act(() => vi.runAllTimersAsync())
    expect(Element.prototype.animate).not.toHaveBeenCalled()

    vi.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList)
  })

  it('remains deterministic after the StrictMode lifecycle check', async () => {
    render(
      <StrictMode>
        <RevealText interval={0} value="Strict mode" />
      </StrictMode>,
    )
    await act(() => vi.runAllTimersAsync())

    expect(Element.prototype.animate).toHaveBeenCalledTimes(2)
  })

  it('does not animate a final word again while it is extended', async () => {
    const { rerender } = render(<RevealText interval={0} value="Stream" />)
    await act(() => vi.runAllTimersAsync())
    expect(Element.prototype.animate).toHaveBeenCalledTimes(1)

    rerender(<RevealText interval={0} value="Streaming" />)
    await act(() => vi.runAllTimersAsync())
    expect(Element.prototype.animate).toHaveBeenCalledTimes(1)
  })

  it('replaces rewrites immediately and animates after an explicit reset', async () => {
    const { rerender } = render(<RevealText interval={0} value="Hello world" />)
    await act(() => vi.runAllTimersAsync())
    expect(Element.prototype.animate).toHaveBeenCalledTimes(2)

    rerender(<RevealText interval={0} value="Hello there" />)
    await act(() => vi.runAllTimersAsync())
    expect(Element.prototype.animate).toHaveBeenCalledTimes(2)

    rerender(<RevealText interval={0} value="" />)
    rerender(<RevealText interval={0} value="Fresh start" />)
    await act(() => vi.runAllTimersAsync())
    expect(Element.prototype.animate).toHaveBeenCalledTimes(4)
  })

  it('calls onComplete once after its scheduled batch settles', async () => {
    const onComplete = vi.fn()
    render(<RevealText interval={0} onComplete={onComplete} value="One batch" />)
    await act(() => vi.runAllTimersAsync())

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('bounds live wrappers while streaming and leaves clean DOM when complete', async () => {
    const onSettled = vi.fn()
    const value = 'one two three four five'
    const { getByLabelText, rerender } = render(
      <RevealText
        interval={0}
        maxAnimatedItems={2}
        onSettled={onSettled}
        streaming
        value={value}
      />,
    )
    await act(() => vi.runAllTimersAsync())

    const root = getByLabelText(value)
    expect(root.querySelectorAll('span')).toHaveLength(2)
    expect(root.textContent).toBe(value)
    expect(onSettled).not.toHaveBeenCalled()

    const appendedValue = `${value} six seven`
    rerender(
      <RevealText
        interval={0}
        maxAnimatedItems={2}
        onSettled={onSettled}
        streaming
        value={appendedValue}
      />,
    )
    await act(() => vi.runAllTimersAsync())
    expect(root.querySelectorAll('span')).toHaveLength(2)
    expect(root.textContent).toBe(appendedValue)

    rerender(
      <RevealText
        interval={0}
        maxAnimatedItems={2}
        onSettled={onSettled}
        streaming={false}
        value={appendedValue}
      />,
    )
    await act(() => vi.runAllTimersAsync())

    expect(root.querySelectorAll('span')).toHaveLength(0)
    expect(root.textContent).toBe(appendedValue)
    expect(onSettled).toHaveBeenCalledTimes(1)
  })

  it('defers final compaction while text inside the root is selected', async () => {
    const value = 'selected text'
    const { getByLabelText, rerender } = render(
      <RevealText interval={0} maxAnimatedItems={10} streaming value={value} />,
    )
    await act(() => vi.runAllTimersAsync())

    const root = getByLabelText(value)
    const textNode = root.querySelector('span')?.firstChild
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(textNode as Node)
    selection?.removeAllRanges()
    selection?.addRange(range)

    rerender(
      <RevealText interval={0} maxAnimatedItems={10} streaming={false} value={value} />,
    )
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(root.querySelectorAll('span')).toHaveLength(2)

    act(() => {
      selection?.removeAllRanges()
      document.dispatchEvent(new Event('selectionchange'))
    })
    await act(() => vi.runAllTimersAsync())
    expect(root.querySelectorAll('span')).toHaveLength(0)
  })

})
