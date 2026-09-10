import {
  Children,
  createElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'
import { RevealUnit } from './RevealUnit'
import type { RevealGroupProps } from './types'
import { useRevealScheduler } from './useRevealScheduler'
import { useRevealTrigger } from './useRevealTrigger'

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function RevealGroup({
  active: controlledActive = true,
  as: Root = 'div',
  children,
  className,
  duration = 420,
  effect = 'fade-up',
  interval = 70,
  itemAs = 'div',
  itemClassName,
  maxLag = 280,
  onComplete,
  onSettled,
  style,
  trigger = 'mount',
}: RevealGroupProps) {
  const childArray = Children.toArray(children)
  const seenKeysRef = useRef(new Set<string>())
  const { active, rootRef } = useRevealTrigger(trigger, controlledActive)
  const { release, schedule } = useRevealScheduler({
    interval,
    maxLag,
    onIdle: () => {
      onSettled?.()
      if (onComplete !== onSettled) onComplete?.()
    },
  })
  const entries = childArray.map((child, index) => ({
    child,
    key: String(isValidElement(child) ? (child.key ?? index) : index),
  }))
  const currentKeys = new Set(entries.map(({ key }) => key))
  const newKeys = new Set(
    entries.filter(({ key }) => !seenKeysRef.current.has(key)).map(({ key }) => key),
  )

  useBrowserLayoutEffect(() => {
    seenKeysRef.current = currentKeys
  })

  return createElement(
    Root,
    { className, ref: rootRef, style },
    entries.map(({ child, key }) => {
      const unitId = `group:${key}`
      return (
        <RevealUnit
          active={active}
          as={itemAs}
          className={itemClassName}
          duration={duration}
          effect={effect}
          key={key}
          pending={newKeys.has(key)}
          release={release}
          schedule={schedule}
          unitId={unitId}
        >
          {child}
        </RevealUnit>
      )
    }),
  )
}
