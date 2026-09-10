import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { RevealScheduler, type RevealTask } from './core/scheduler'

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

interface UseRevealSchedulerOptions {
  interval: number
  maxLag: number
  onIdle?: () => void
}

export function useRevealScheduler({ interval, maxLag, onIdle }: UseRevealSchedulerOptions) {
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  const schedulerRef = useRef<RevealScheduler | null>(null)
  if (!schedulerRef.current) {
    schedulerRef.current = new RevealScheduler({
      interval,
      maxLag,
      onIdle: () => onIdleRef.current?.(),
    })
  }

  const scheduler = schedulerRef.current
  scheduler.configure({ interval, maxLag, onIdle: () => onIdleRef.current?.() })

  useBrowserLayoutEffect(() => () => scheduler.cancel(), [scheduler])

  const schedule = useCallback(
    (task: RevealTask) => {
      scheduler.enqueue(task)
    },
    [scheduler],
  )
  const release = useCallback((id: string) => scheduler.release(id), [scheduler])

  return { release, schedule }
}
