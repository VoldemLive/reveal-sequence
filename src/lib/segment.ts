import type { RevealGranularity, Segment, TextUnit } from './types'

interface OffsetSegment extends Segment {
  complete?: boolean
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

function sentenceSegments(value: string): OffsetSegment[] {
  const segments: OffsetSegment[] = []
  const pattern = /[\s\S]*?[.!?]+(?:["'”’)]*)?(?=\s|$)/gu
  let start = 0

  for (const match of value.matchAll(pattern)) {
    const text = match[0]
    const end = (match.index ?? start) + text.length
    segments.push({
      animated: /\S/u.test(text),
      complete: true,
      end,
      start,
      text,
    })
    start = end
  }

  if (start < value.length) {
    segments.push({
      animated: false,
      complete: false,
      end: value.length,
      start,
      text: value.slice(start),
    })
  }

  return segments
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
  if (granularity === 'sentence') return sentenceSegments(value)

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
      segment.complete ??
      (granularity !== 'word' ||
        segment.end < value.length ||
        !/[\p{L}\p{M}\p{N}_]$/u.test(segment.text)),
    id:
      granularity === 'sentence'
        ? `${generation}:${segment.start}:sentence`
        : `${generation}:${segment.start}:${segment.animated ? 'content' : 'separator'}`,
    kind: segment.animated ? 'content' : 'separator',
  }))
}
