import type { RevealEffect } from './types'

const effects: Record<RevealEffect, Keyframe[]> = {
  fade: [{ opacity: 0 }, { opacity: 1 }],
  'fade-up': [
    { opacity: 0, transform: 'translateY(0.55em)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  blur: [
    { filter: 'blur(7px)', opacity: 0, transform: 'translateY(0.2em)' },
    { filter: 'blur(0)', opacity: 1, transform: 'translateY(0)' },
  ],
}

export function getEffectKeyframes(effect: RevealEffect): Keyframe[] {
  return effects[effect]
}

export function getInitialFrame(effect: RevealEffect): Keyframe {
  return effects[effect][0]
}

export function getAdaptiveInterval(count: number, interval: number, maxLag: number): number {
  if (count <= 1) return 0
  return Math.min(interval, maxLag / (count - 1))
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
