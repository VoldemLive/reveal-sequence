import type { CSSProperties, ElementType, ReactNode } from 'react'

export type RevealEffect = 'fade' | 'fade-up' | 'blur'
export type RevealTrigger = 'mount' | 'in-view' | 'controlled'
export type RevealGranularity = 'grapheme' | 'word' | 'paragraph'
export type RevealMode = 'once' | 'append'
export type RevealAnnouncement = 'off' | 'sentence' | 'complete'

export interface RevealTimingProps {
  duration?: number
  effect?: RevealEffect
  interval?: number
  maxLag?: number
}

export interface RevealTextProps extends RevealTimingProps {
  active?: boolean
  /** Announces completed sentences or the final streamed value in a polite live region. */
  announce?: RevealAnnouncement
  as?: ElementType
  by?: RevealGranularity
  className?: string
  locale?: string | string[]
  maxAnimatedItems?: number
  mode?: RevealMode
  onComplete?: () => void
  onSettled?: () => void
  style?: CSSProperties
  streaming?: boolean
  trigger?: RevealTrigger
  value: string
}

export interface RevealGroupProps extends RevealTimingProps {
  active?: boolean
  as?: ElementType
  children: ReactNode
  className?: string
  itemAs?: ElementType
  itemClassName?: string
  onComplete?: () => void
  onSettled?: () => void
  style?: CSSProperties
  trigger?: RevealTrigger
}

export interface Segment {
  animated: boolean
  text: string
}

export interface TextUnit extends Segment {
  complete: boolean
  end: number
  id: string
  kind: 'content' | 'separator'
  start: number
}

export type RevealUnitPhase = 'pending' | 'animating' | 'settled'
