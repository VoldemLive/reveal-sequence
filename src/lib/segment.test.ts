import { describe, expect, it } from 'vitest'
import { segmentText } from './segment'

describe('segmentText', () => {
  it.each(['grapheme', 'word', 'sentence', 'paragraph'] as const)(
    'preserves the source text when splitting by %s',
    (granularity) => {
      const source = 'Hello 👨‍👩‍👧‍👦\n\nA second paragraph.'
      expect(segmentText(source, granularity).map(({ text }) => text).join('')).toBe(source)
    },
  )

  it('marks an unfinished sentence as visible but not animated', () => {
    expect(segmentText('First sentence. Incomplete', 'sentence')).toEqual([
      { animated: true, text: 'First sentence.' },
      { animated: false, text: ' Incomplete' },
    ])
  })

  it('keeps a joined emoji as one grapheme', () => {
    const emoji = '👨‍👩‍👧‍👦'
    expect(segmentText(emoji, 'grapheme')).toEqual([{ animated: true, text: emoji }])
  })

  it('preserves punctuation without wrapping it as a word', () => {
    expect(segmentText('Hello, world!', 'word')).toEqual([
      { animated: true, text: 'Hello' },
      { animated: false, text: ',' },
      { animated: false, text: ' ' },
      { animated: true, text: 'world' },
      { animated: false, text: '!' },
    ])
  })

  it('still treats emoji as content in word mode', () => {
    expect(segmentText('Hello 👋', 'word').at(-1)).toEqual({ animated: true, text: '👋' })
  })
})
