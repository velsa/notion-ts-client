/* eslint-disable prefer-spread */
/* eslint-disable @typescript-eslint/no-explicit-any */
// https://github.com/sindresorhus/p-throttle
export class AbortError extends Error {
  constructor() {
    super('Throttled function aborted')
    this.name = 'AbortError'
  }
}

export default function pThrottle(opts: { limit: number; interval: number; strict?: boolean; onDelay?: () => void }) {
  const { limit, interval, strict, onDelay } = opts

  if (!Number.isFinite(limit)) {
    throw new TypeError('Expected `limit` to be a finite number')
  }

  if (!Number.isFinite(interval)) {
    throw new TypeError('Expected `interval` to be a finite number')
  }

  const queue = new Map()
  let currentTick = 0
  let activeCount = 0

  function windowedDelay() {
    const now = Date.now()

    if (now - currentTick > interval) {
      activeCount = 1
      currentTick = now

      return 0
    }

    if (activeCount < limit) {
      activeCount++
    } else {
      currentTick += interval
      activeCount = 1
    }

    return currentTick - now
  }

  const strictTicks: number[] = []

  function strictDelay() {
    const now = Date.now()

    // Clear the queue if there's a significant delay since the last execution
    if (strictTicks.length > 0 && now - (strictTicks.at(-1) ?? 0) > interval) {
      strictTicks.length = 0
    }

    // If the queue is not full, add the current time and execute immediately
    if (strictTicks.length < limit) {
      strictTicks.push(now)

      return 0
    }

    // Check if strictTicks is not empty before accessing its first element
    const nextExecutionTime = (strictTicks[0] ?? 0) + interval

    // Shift the queue and add the new execution time
    strictTicks.shift()
    strictTicks.push(nextExecutionTime)

    // Calculate the delay for the current execution
    return Math.max(0, nextExecutionTime - now)
  }

  const getDelay = strict ? strictDelay : windowedDelay

  return (function_: { apply: (arg0: unknown, arg1: unknown[]) => unknown }) => {
    const throttled = (...arguments_: unknown[]) => {
      if (!throttled.isEnabled) {
        return (async () => await function_.apply(null, arguments_))()
      }

      let timeoutId: NodeJS.Timeout

      return new Promise((resolve, reject) => {
        const execute = () => {
          resolve(function_.apply(null, arguments_))
          queue.delete(timeoutId)
        }
        const delay = getDelay()

        if (delay > 0) {
          timeoutId = setTimeout(execute, delay)
          queue.set(timeoutId, reject)
          onDelay?.()
        } else {
          execute()
        }
      })
    }

    throttled.abort = () => {
      for (const timeout of Array.from(queue.keys())) {
        clearTimeout(timeout)
        queue.get(timeout)(new AbortError())
      }

      queue.clear()
      strictTicks.splice(0, strictTicks.length)
    }

    throttled.isEnabled = true

    Object.defineProperty(throttled, 'queueSize', {
      get() {
        return queue.size
      },
    })

    return throttled
  }
}
