import type { RevealGranularity, RevealPresetEffect } from '../lib'

const narrativeParagraphs = [
  'Streaming UI should feel responsive, even when the network is not. Reveal Sequence keeps the past stable and animates only the arriving tail.',
  'When a burst arrives, it protects the DOM before decorative motion.',
]

export const narrativeText = narrativeParagraphs.join('\n\n')

const narrativeSentences = [
  'Streaming UI should feel responsive, even when the network is not. ',
  'Reveal Sequence keeps the past stable and animates only the arriving tail.\n\n',
  'When a burst arrives, it protects the DOM before decorative motion.',
]

export const streamCadenceByGranularity: Record<RevealGranularity, number> = {
  grapheme: 16,
  word: 72,
  sentence: 540,
  paragraph: 760,
}

export const streamUnitLabel: Record<RevealGranularity, string> = {
  grapheme: 'grapheme',
  word: 'word',
  sentence: 'sentence',
  paragraph: 'paragraph',
}

export function createStreamChunks(value: string, granularity: RevealGranularity): string[] {
  if (granularity === 'grapheme') {
    if (typeof Intl.Segmenter !== 'undefined') {
      return Array.from(new Intl.Segmenter().segment(value), ({ segment }) => segment)
    }

    return Array.from(value)
  }

  if (granularity === 'word') return value.match(/\s+|[^\s]+/gu) ?? []
  if (granularity === 'sentence') return narrativeSentences

  return narrativeParagraphs.map((paragraph, index) =>
    index === narrativeParagraphs.length - 1 ? paragraph : paragraph + '\n\n',
  )
}

export type ActivityKind = 'message' | 'status' | 'assignee' | 'alert'

export type ActivityCard = {
  id: number
  kind: ActivityKind
  label: string
  detail: string
}

export const activityActions: ReadonlyArray<{ kind: ActivityKind; label: string; icon: string }> = [
  { kind: 'message', label: 'Message', icon: '↗' },
  { kind: 'status', label: 'Status', icon: '✓' },
  { kind: 'assignee', label: 'Assignee', icon: '◎' },
  { kind: 'alert', label: 'Alert', icon: '!' },
]

export const initialCards: ActivityCard[] = [
  { id: 1, kind: 'message', label: 'Mila left a note', detail: '“I added the handoff conditions.”' },
  { id: 2, kind: 'status', label: 'Ready for review', detail: 'Status changed from Draft' },
]

export const maxActivityCards = 6

export function createActivityCard(id: number, kind: ActivityKind): ActivityCard {
  const templates: Record<ActivityKind, Omit<ActivityCard, 'id' | 'kind'>> = {
    message: { label: 'Mila left a note', detail: '“I added the handoff conditions.”' },
    status: { label: 'Ready for review', detail: 'Status changed from Draft' },
    assignee: { label: 'Mila Chen joined', detail: 'Assigned as the workflow owner' },
    alert: { label: 'Needs attention', detail: 'One required detail is still missing' },
  }

  return { id, kind, ...templates[kind] }
}

export const granularityOptions: ReadonlyArray<{ value: RevealGranularity; label: string }> = [
  { value: 'grapheme', label: 'Grapheme' },
  { value: 'word', label: 'Word' },
  { value: 'sentence', label: 'Sentence' },
  { value: 'paragraph', label: 'Paragraph' },
]

export const previewEffects: ReadonlyArray<{ value: RevealPresetEffect; icon: string; label: string }> = [
  { value: 'fade-up', icon: '↑', label: 'Fade up' },
  { value: 'fade-down', icon: '↓', label: 'Fade down' },
  { value: 'slide-left', icon: '←', label: 'Slide left' },
  { value: 'slide-right', icon: '→', label: 'Slide right' },
  { value: 'scale', icon: 'scale', label: 'Scale' },
  { value: 'fade', icon: '◐', label: 'Fade' },
  { value: 'blur', icon: '✦', label: 'Blur' },
]
