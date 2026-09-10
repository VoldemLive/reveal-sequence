import type { RevealGranularity, Segment, TextUnit } from './types'

interface OffsetSegment extends Segment {
  end: number
  start: number
}

function fallbackSegments(value: string, granularity: 'grapheme' | 'word'): OffsetSegment[] {
  if (granularity === 'grapheme') {
    let start = 0
    return Array.from(value, (text) => {
      const segment = {
        animated: !/^\s+$/u.test(text),
        end: start + text.length,
        start,
        text,
      }
      start = segment.end
      return segment
    })
  }

  return Array.from(value.matchAll(/\s+|[^\s]+/gu), (match) => ({
    animated: !/^\s+$/u.test(match[0]),
    end: (match.index ?? 0) + match[0].length,
    start: match.index ?? 0,
    text: match[0],
  }))
}

function paragraphSegments(value: string): OffsetSegment[] {
  return Array.from(value.matchAll(/\n{2,}|(?:(?!\n{2,})[\s\S])+/gu), (match) => ({
    animated: !/^\s+$/u.test(match[0]),
    end: (match.index ?? 0) + match[0].length,
    start: match.index ?? 0,
    text: match[0],
  }))
}

function offsetSegments(
  value: string,
  granularity: RevealGranularity,
  locale?: string | string[],
): OffsetSegment[] {
  if (!value) return []
  if (granularity === 'paragraph') return paragraphSegments(value)

  if (typeof Intl.Segmenter !== 'function') {
    return fallbackSegments(value, granularity)
  }

  const segmenter = new Intl.Segmenter(locale, { granularity })
  return Array.from(segmenter.segment(value), ({ index, isWordLike, segment }) => {
    const isContent =
      !/^\s+$/u.test(segment) &&
      (granularity !== 'word' || isWordLike !== false || /\p{Extended_Pictographic}/u.test(segment))

    return {
      animated: isContent,
      end: index + segment.length,
      start: index,
      text: segment,
    }
  })
}

export function segmentText(
  value: string,
  granularity: RevealGranularity,
  locale?: string | string[],
): Segment[] {
  return offsetSegments(value, granularity, locale).map(({ animated, text }) => ({ animated, text }))
}

export function segmentTextUnits(
  value: string,
  granularity: RevealGranularity,
  generation: number,
  locale?: string | string[],
): TextUnit[] {
  return offsetSegments(value, granularity, locale).map((segment) => ({
    ...segment,
    complete:
      granularity !== 'word' ||
      segment.end < value.length ||
      !/[\p{L}\p{M}\p{N}_]$/u.test(segment.text),
    id: `${generation}:${segment.start}:${segment.animated ? 'content' : 'separator'}`,
    kind: segment.animated ? 'content' : 'separator',
  }))
}
