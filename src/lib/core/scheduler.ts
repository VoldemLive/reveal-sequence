export interface RevealTask {
  arrivedAt?: number
  id: string
  start: () => Promise<unknown> | unknown
}

export interface RevealSchedulerOptions {
  interval: number
  maxLag: number
  onIdle?: () => void
}

export interface SchedulerEnvironment {
  clearTimer: (timer: ReturnType<typeof setTimeout>) => void
  now: () => number
  setTimer: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
}

const browserEnvironment: SchedulerEnvironment = {
  clearTimer: (timer) => clearTimeout(timer),
  now: () => (typeof performance === 'undefined' ? Date.now() : performance.now()),
  setTimer: (callback, delay) => setTimeout(callback, delay),
}

interface QueuedTask extends RevealTask {
  arrivedAt: number
  token: symbol
}

export class RevealScheduler {
  private activeCount = 0
  private environment: SchedulerEnvironment
  private generation = 0
  private idleArmed = false
  private knownTasks = new Map<string, symbol>()
  private options: RevealSchedulerOptions
  private queue: QueuedTask[] = []
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(
    options: RevealSchedulerOptions,
    environment: SchedulerEnvironment = browserEnvironment,
  ) {
    this.options = options
    this.environment = environment
  }

  configure(options: RevealSchedulerOptions): void {
    this.options = options
  }

  enqueue(task: RevealTask): void {
    if (this.knownTasks.has(task.id)) return

    const token = Symbol(task.id)
    this.knownTasks.set(task.id, token)
    this.queue.push({ ...task, arrivedAt: task.arrivedAt ?? this.environment.now(), token })
    this.idleArmed = true
    this.ensureTimer(0)
  }

  release(id: string): void {
    const token = this.knownTasks.get(id)
    if (!token) return

    this.knownTasks.delete(id)
    this.queue = this.queue.filter((task) => task.token !== token)
    if (this.queue.length === 0 && this.activeCount === 0) {
      this.clearTimer()
      this.emitIdle()
    }
  }

  cancel(): void {
    this.clearTimer()
    this.queue = []
    this.knownTasks.clear()
    this.activeCount = 0
    this.idleArmed = false
    this.generation += 1
  }

  private clearTimer(): void {
    if (this.timer === undefined) return
    this.environment.clearTimer(this.timer)
    this.timer = undefined
  }

  private ensureTimer(delay: number): void {
    if (this.timer !== undefined || this.queue.length === 0) return
    this.timer = this.environment.setTimer(() => {
      this.timer = undefined
      this.tick()
    }, Math.max(0, delay))
  }

  private tick(): void {
    if (this.queue.length === 0) {
      this.emitIdle()
      return
    }

    const now = this.environment.now()
    const interval = Math.max(0, this.options.interval)
    const maxLag = Math.max(0, this.options.maxLag)
    const deadline = this.queue[0].arrivedAt + maxLag
    const remaining = deadline - now
    const remainingSlots = interval === 0 ? 1 : Math.max(1, Math.floor(remaining / interval))
    const batchSize =
      remaining <= 0
        ? this.queue.length
        : Math.max(1, Math.ceil(this.queue.length / remainingSlots))
    const batch = this.queue.splice(0, batchSize)
    const generation = this.generation

    for (const task of batch) {
      this.activeCount += 1
      let result: Promise<unknown>
      try {
        result = Promise.resolve(task.start())
      } catch (error) {
        result = Promise.reject(error)
      }

      void result.catch(() => undefined).finally(() => {
        if (generation !== this.generation) return
        this.activeCount -= 1
        if (this.knownTasks.get(task.id) === task.token) this.knownTasks.delete(task.id)
        this.emitIdle()
      })
    }

    if (this.queue.length > 0) this.ensureTimer(interval)
    this.emitIdle()
  }

  private emitIdle(): void {
    if (!this.idleArmed || this.queue.length > 0 || this.activeCount > 0) return
    this.idleArmed = false
    this.options.onIdle?.()
  }
}
