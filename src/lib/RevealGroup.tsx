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
  easing = 'cubic-bezier(0.22, 1, 0.36, 1)',
  effect = 'fade-up',
  interval = 70,
  inView,
  itemAs = 'div',
  itemClassName,
  maxLag = 280,
  onSettled,
  style,
  trigger = 'mount',
}: RevealGroupProps) {
  const childArray = Children.toArray(children)
  const seenKeysRef = useRef(new Set<string>())
  const { active, rootRef } = useRevealTrigger(trigger, controlledActive, inView)
  const { release, schedule } = useRevealScheduler({
    interval,
    maxLag,
    onIdle: onSettled,
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
          easing={easing}
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
