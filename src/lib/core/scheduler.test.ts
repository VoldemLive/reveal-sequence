import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  RevealScheduler,
  type SchedulerEnvironment,
} from './scheduler'

function createEnvironment() {
  let now = 0
  const environment: SchedulerEnvironment = {
    clearTimer: (timer) => clearTimeout(timer),
    now: () => now,
    setTimer: (callback, delay) =>
      setTimeout(() => {
        now += delay
        callback()
      }, delay),
  }
  return environment
}

describe('RevealScheduler', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('compresses a queue so its starts fit inside maxLag', async () => {
    vi.useFakeTimers()
    const started: string[] = []
    const scheduler = new RevealScheduler(
      { interval: 30, maxLag: 90 },
      createEnvironment(),
    )

    for (let index = 0; index < 6; index += 1) {
      scheduler.enqueue({ id: String(index), start: () => started.push(String(index)) })
    }

    await vi.advanceTimersByTimeAsync(0)
    expect(started).toEqual(['0', '1'])
    await vi.advanceTimersByTimeAsync(30)
    expect(started).toEqual(['0', '1', '2', '3'])
    await vi.advanceTimersByTimeAsync(30)
    expect(started).toEqual(['0', '1', '2', '3', '4', '5'])
  })

  it('deduplicates pending tasks by id', async () => {
    vi.useFakeTimers()
    const start = vi.fn()
    const scheduler = new RevealScheduler(
      { interval: 20, maxLag: 100 },
      createEnvironment(),
    )

    scheduler.enqueue({ id: 'same', start })
    scheduler.enqueue({ id: 'same', start })
    await vi.runAllTimersAsync()

    expect(start).toHaveBeenCalledTimes(1)
  })

  it('reports idle only after the final animation settles', async () => {
    vi.useFakeTimers()
    let settle: (() => void) | undefined
    const finished = new Promise<void>((resolve) => {
      settle = resolve
    })
    const onIdle = vi.fn()
    const scheduler = new RevealScheduler(
      { interval: 20, maxLag: 100, onIdle },
      createEnvironment(),
    )

    scheduler.enqueue({ id: 'deferred', start: () => finished })
    await vi.runAllTimersAsync()
    expect(onIdle).not.toHaveBeenCalled()

    settle?.()
    await Promise.resolve()
    await Promise.resolve()
    expect(onIdle).toHaveBeenCalledTimes(1)
  })

  it('cancels pending work and can be reused', async () => {
    vi.useFakeTimers()
    const start = vi.fn()
    const scheduler = new RevealScheduler(
      { interval: 20, maxLag: 100 },
      createEnvironment(),
    )

    scheduler.enqueue({ id: 'old', start })
    scheduler.cancel()
    await vi.runAllTimersAsync()
    expect(start).not.toHaveBeenCalled()

    scheduler.enqueue({ id: 'new', start })
    await vi.runAllTimersAsync()
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('allows an active id to be released and scheduled again', async () => {
    vi.useFakeTimers()
    let settleFirst: (() => void) | undefined
    const firstFinished = new Promise<void>((resolve) => {
      settleFirst = resolve
    })
    const startFirst = vi.fn(() => firstFinished)
    const startSecond = vi.fn()
    const scheduler = new RevealScheduler(
      { interval: 0, maxLag: 100 },
      createEnvironment(),
    )

    scheduler.enqueue({ id: 'reused', start: startFirst })
    await vi.runAllTimersAsync()
    scheduler.release('reused')
    scheduler.enqueue({ id: 'reused', start: startSecond })
    await vi.runAllTimersAsync()

    expect(startFirst).toHaveBeenCalledTimes(1)
    expect(startSecond).toHaveBeenCalledTimes(1)
    settleFirst?.()
  })
})
