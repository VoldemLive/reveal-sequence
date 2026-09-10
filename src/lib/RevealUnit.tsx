import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  type ElementType,
  type ReactNode,
} from 'react'
import { getEffectKeyframes, getInitialFrame, prefersReducedMotion } from './animation'
import type { RevealEffect, RevealUnitPhase } from './types'

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

interface RevealUnitProps {
  active: boolean
  as: ElementType
  children: ReactNode
  className?: string
  duration: number
  effect: RevealEffect
  hiddenFromAssistiveTech?: boolean
  onPhaseChange?: (id: string, phase: RevealUnitPhase) => void
  pending: boolean
  release: (id: string) => void
  schedule: (task: { id: string; start: () => Promise<unknown> | unknown }) => void
  unitId: string
}

function clearAnimationStyles(element: HTMLElement): void {
  element.style.removeProperty('filter')
  element.style.removeProperty('opacity')
  element.style.removeProperty('transform')
  if (element.style.length === 0) element.removeAttribute('style')
}

export function RevealUnit({
  active,
  as,
  children,
  className,
  duration,
  effect,
  hiddenFromAssistiveTech = false,
  onPhaseChange,
  pending,
  release,
  schedule,
  unitId,
}: RevealUnitProps) {
  const elementRef = useRef<HTMLElement | null>(null)
  const pendingRef = useRef(pending)
  const hasAnimatedRef = useRef(!pending)
  const settledRef = useRef(!pending)
  const animationRef = useRef<Animation | null>(null)
  const animationConfigRef = useRef({ duration, effect })

  useBrowserLayoutEffect(() => {
    const element = elementRef.current
    if (!element || hasAnimatedRef.current || !pendingRef.current) return

    onPhaseChange?.(unitId, 'pending')
    clearAnimationStyles(element)
    Object.assign(element.style, getInitialFrame(animationConfigRef.current.effect))

    if (!active) {
      return
    }

    hasAnimatedRef.current = true
    schedule({
      id: unitId,
      start: () => {
        onPhaseChange?.(unitId, 'animating')
        if (prefersReducedMotion() || typeof element.animate !== 'function') {
          settledRef.current = true
          clearAnimationStyles(element)
          onPhaseChange?.(unitId, 'settled')
          return
        }

        const animation = element.animate(getEffectKeyframes(animationConfigRef.current.effect), {
          duration: animationConfigRef.current.duration,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'both',
        })
        animationRef.current = animation

        return animation.finished.then(
          () => {
            settledRef.current = true
            animationRef.current = null
            clearAnimationStyles(element)
            onPhaseChange?.(unitId, 'settled')
          },
          () => {
            animationRef.current = null
            clearAnimationStyles(element)
          },
        )
      },
    })

    return () => {
      release(unitId)
      animationRef.current?.cancel()
      animationRef.current = null
      if (!settledRef.current) hasAnimatedRef.current = false
    }
  }, [active, onPhaseChange, release, schedule, unitId])

  return createElement(
    as,
    {
      'aria-hidden': hiddenFromAssistiveTech || undefined,
      className,
      ref: elementRef,
    },
    children,
  )
}
