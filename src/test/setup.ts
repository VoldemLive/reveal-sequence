import { vi } from 'vitest'

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    matches: false,
    removeEventListener: vi.fn(),
  })),
})

Object.defineProperty(Element.prototype, 'animate', {
  configurable: true,
  value: vi.fn().mockImplementation(() => ({
    cancel: vi.fn(),
    finished: Promise.resolve(),
  })),
})
