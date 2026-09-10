import { useEffect, useRef, useState } from 'react'
import type { RevealInViewOptions, RevealTrigger } from './types'

export function useRevealTrigger(
  trigger: RevealTrigger,
  controlledActive: boolean,
  inViewOptions: RevealInViewOptions | undefined,
) {
  const rootRef = useRef<HTMLElement | null>(null)
  const [isInView, setInView] = useState(trigger !== 'in-view')

  useEffect(() => {
    if (trigger !== 'in-view' || !rootRef.current) return
    if (typeof IntersectionObserver !== 'function') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (entry.isIntersecting && inViewOptions?.once !== false) observer.disconnect()
      },
      {
        root: inViewOptions?.root,
        rootMargin: inViewOptions?.rootMargin,
        threshold: inViewOptions?.threshold ?? 0.15,
      },
    )

    observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [inViewOptions?.once, inViewOptions?.root, inViewOptions?.rootMargin, inViewOptions?.threshold, trigger])

  return {
    active: trigger === 'controlled' ? controlledActive : isInView,
    rootRef,
  }
}
