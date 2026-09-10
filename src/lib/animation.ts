import type { RevealEffect, RevealPresetEffect } from './types'

const effects: Record<RevealPresetEffect, Keyframe[]> = {
  fade: [{ opacity: 0 }, { opacity: 1 }],
  'fade-up': [
    { opacity: 0, transform: 'translateY(0.55em)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  'fade-down': [
    { opacity: 0, transform: 'translateY(-0.55em)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  'slide-left': [
    { opacity: 0, transform: 'translateX(-0.55em)' },
    { opacity: 1, transform: 'translateX(0)' },
  ],
  'slide-right': [
    { opacity: 0, transform: 'translateX(0.55em)' },
    { opacity: 1, transform: 'translateX(0)' },
  ],
  scale: [
    { opacity: 0, transform: 'scale(0.96)' },
    { opacity: 1, transform: 'scale(1)' },
  ],
  blur: [
    { filter: 'blur(7px)', opacity: 0, transform: 'translateY(0.2em)' },
    { filter: 'blur(0)', opacity: 1, transform: 'translateY(0)' },
  ],
}

export function getEffectKeyframes(effect: RevealEffect): Keyframe[] {
  return typeof effect === 'string' ? effects[effect] : effect.keyframes
}

export function getEffectEasing(effect: RevealEffect, fallback: string): string {
  return typeof effect === 'string' ? fallback : (effect.easing ?? fallback)
}

export function getInitialFrame(effect: RevealEffect): Keyframe {
  return getEffectKeyframes(effect)[0] ?? {}
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
