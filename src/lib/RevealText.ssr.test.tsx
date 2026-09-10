import { act } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RevealText } from './RevealText'

describe('RevealText SSR', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders readable plain text on the server', () => {
    const markup = renderToStaticMarkup(
      <RevealText as="p" mode="append" value="Server-rendered text." />,
    )

    expect(markup).toContain('Server-rendered text.')
    expect(markup).not.toContain('<span')
  })

  it('hydrates append-mode text without a mismatch', async () => {
    const value = 'Hydration keeps this readable.'
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RevealText as="p" value={value} />)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    let root: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, <RevealText as="p" value={value} />)
      await Promise.resolve()
    })

    expect(consoleError).not.toHaveBeenCalled()
    expect(container.textContent).toBe(value)
    await act(async () => root!.unmount())
  })

  it('starts mode="once" only after hydration', async () => {
    vi.useFakeTimers()
    const value = 'Animate after hydration'
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(
      <RevealText as="p" interval={0} mode="once" value={value} />,
    )
    vi.mocked(Element.prototype.animate).mockClear()

    let root: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, <RevealText as="p" interval={0} mode="once" value={value} />)
    })
    await act(async () => {
      await Promise.resolve()
    })
    await act(() => vi.runAllTimersAsync())

    expect(Element.prototype.animate).toHaveBeenCalledTimes(3)
    await act(async () => root!.unmount())
  })
})
