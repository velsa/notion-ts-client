/* eslint-disable no-extra-semi */
/* eslint-disable @typescript-eslint/no-explicit-any */ /* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-rest-params */
import { EventEmitter } from 'events'

type ExtendedEventEmitter = Partial<EventEmitter> & {
  to: (count: number) => any
  per: (time: number) => any
  evenly: (evenly: boolean) => any
  withFuzz: (fuzz: number) => any
  fuzz: (fuzz: number) => any
  maxQueueLength: (max: number) => any
}

export type RateLimiter<T> = ExtendedEventEmitter | T

function reEmit(oriEmitter: EventEmitter, newEmitter: EventEmitter) {
  const oriEmit = oriEmitter.emit,
    newEmit = newEmitter.emit

  oriEmitter.emit = function () {
    newEmit.apply(newEmitter, arguments as any)
    oriEmit.apply(oriEmitter, arguments as any)
  } as any
}

function limit<T extends (...args: any) => any>(fn: T, ctx?: any) {
  let _to = 1,
    _per = -1,
    _fuzz = 0,
    _evenly = false,
    _maxQueueLength = 5000
  let pastExecs: any[] = []
  let timer: NodeJS.Timeout = null
  const queue: any[] = []

  function pump() {
    const now = Date.now()

    pastExecs = pastExecs.filter(function (time) {
      return now - time < _per
    })

    while (pastExecs.length < _to && queue.length > 0) {
      pastExecs.push(now)

      const tmp = queue.shift()
      const rtn = fn.apply(ctx, tmp.args)

      tmp.emitter.emit('limiter-exec', rtn)

      if (rtn && rtn.emit) {
        reEmit(rtn, tmp.emitter)
      }

      if (_evenly) {
        break
      } // Ensures only one function is executed every pump
    }

    if (pastExecs.length <= 0) {
      timer = null
    } else if (queue.length <= 0) {
      // Clear pastExec array when queue is empty asap
      const lastIdx = pastExecs.length - 1

      timer = setTimeout(pump, _per - (now - pastExecs[lastIdx]))
    } else if (_per > -1) {
      let delay = _evenly ? _per / _to : _per - (now - pastExecs[0])

      delay += (delay * _fuzz * Math.random()) | 0
      timer = setTimeout(pump, delay)
    }
  }

  const limiter = function (...args: any) {
    if (_maxQueueLength <= queue.length) {
      throw new Error(`Max queue length (${_maxQueueLength}) exceeded`)
    }

    const emitter = new EventEmitter()

    queue.push({ emitter, args })

    if (!timer) {
      timer = setTimeout(pump, 1)
    }

    return emitter as ExtendedEventEmitter
  }

  Object.defineProperty(limiter, 'length', { value: fn.length }) // Match fn signature

  limiter.to = function (count: any) {
    _to = count || 1

    return limiter as unknown as ExtendedEventEmitter
  }

  limiter.per = function (time: number) {
    _per = time || -1

    return limiter as unknown as ExtendedEventEmitter
  }

  limiter.evenly = function (evenly: boolean) {
    _evenly = evenly == null || evenly

    return limiter as unknown as ExtendedEventEmitter
  }

  limiter.withFuzz = function (fuzz: number) {
    _fuzz = fuzz || 0.1

    return limiter as unknown as ExtendedEventEmitter
  }

  limiter.maxQueueLength = function (max: number) {
    _maxQueueLength = max

    return limiter as unknown as ExtendedEventEmitter
  }

  return limiter as unknown as ExtendedEventEmitter
}

limit.promise = function <T extends (...args: any) => Promise<any>>(promiser: T, ctx?: any) {
  const limiter = limit(promiser, ctx)

  function wrapper(...args: any) {
    return new Promise(function (resolve, reject) {
      ;((limiter as unknown as T)(...args) as unknown as EventEmitter).on('limiter-exec', (rtn) =>
        rtn.then(resolve).catch(reject),
      )
    })
  }

  Object.defineProperty(wrapper, 'length', { value: promiser.length }) // Match promiser signature

  wrapper.to = function (count: number) {
    limiter.to(count)

    return wrapper as unknown as ExtendedEventEmitter
  }

  wrapper.per = function (time: number) {
    limiter.per(time)

    return wrapper as unknown as ExtendedEventEmitter
  }

  wrapper.evenly = function (evenly: boolean) {
    limiter.evenly(evenly)

    return wrapper as unknown as ExtendedEventEmitter
  }

  wrapper.withFuzz = function (fuzz: number) {
    limiter.fuzz(fuzz)

    return wrapper as unknown as ExtendedEventEmitter
  }

  wrapper.maxQueueLength = function (max: number) {
    limiter.maxQueueLength(max)

    return wrapper as unknown as ExtendedEventEmitter
  }

  return wrapper as unknown as ExtendedEventEmitter
}

export default limit
