import { describe, expect, it } from 'vitest'
import { getEffectEasing, getEffectKeyframes, getInitialFrame } from './animation'

describe('animation effects', () => {
  it('provides transform-only directional presets', () => {
    expect(getInitialFrame('slide-left')).toEqual({
      opacity: 0,
      transform: 'translateX(-0.55em)',
    })
    expect(getEffectKeyframes('fade-down')).toHaveLength(2)
    expect(getEffectKeyframes('scale')).toHaveLength(2)
  })

  it('uses custom keyframes and lets them override the default easing', () => {
    const effect = {
      easing: 'linear',
      keyframes: [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1)' }],
    }

    expect(getEffectKeyframes(effect)).toBe(effect.keyframes)
    expect(getEffectEasing(effect, 'ease-out')).toBe('linear')
  })
})
