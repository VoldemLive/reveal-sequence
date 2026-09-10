import { useEffect, useRef, useState } from 'react'
import type { RevealTrigger } from './types'

export function useRevealTrigger(trigger: RevealTrigger, controlledActive: boolean) {
  const rootRef = useRef<HTMLElement | null>(null)
  const [inView, setInView] = useState(trigger !== 'in-view')

  useEffect(() => {
    if (trigger !== 'in-view' || !rootRef.current) return
    if (typeof IntersectionObserver !== 'function') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )

    observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [trigger])

  return {
    active: trigger === 'controlled' ? controlledActive : inView,
    rootRef,
  }
}
