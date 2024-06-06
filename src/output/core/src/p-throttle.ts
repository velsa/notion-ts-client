import { REDIS_LOCK_DEFAULT_RETRY_DELAY, REDIS_LOCK_DEFAULT_TIMEOUT, redisLock } from './redis-lock'

export interface ThrottleConfig {
  // The name of the environment, all throttled functions with the same `env` name share the same rate limit
  env: string
  // The maximum number of calls allowed within the interval
  limit: number
  // The length of the interval (window) in milliseconds
  interval: number
  // The Redis client instance to use for environment state storage
  redis?: RedisClient
  // The Redis URL to use for environment state storage
  // redisUrl?: string
  // The Redis database number to use for environment state storage
  // redisDb?: number
  // A callback that is called when a call is delayed
  onDelay?: (info: { delay: number; args: unknown[] }) => void
}

const runEnvs: Record<string, RunEnvironment> = {}

export default function pThrottle(config: ThrottleConfig) {
  const { limit, interval, onDelay } = config

  if (!runEnvs[config.env]) {
    runEnvs[config.env] = new RunEnvironment(config)
  }

  validateConfig(config)

  async function windowedDelay() {
    const env = runEnvs[config.env] as RunEnvironment
    const unlock = (await env.getLock(`windowedDelay`)) as () => Promise<void>
    const now = Date.now()
    let currentTick = await env.getNumValue('currentTick')
    const activeCount = await env.getNumValue('activeCount')

    if (now - currentTick > interval) {
      await env.setValue('currentTick', now)
      await env.setValue('activeCount', 1)
      await unlock()

      return 0
    }

    if (activeCount < limit) {
      await env.setValue('activeCount', activeCount + 1)
    } else {
      currentTick += interval
      await env.setValue('currentTick', currentTick)
      await env.setValue('activeCount', 1)
    }

    await unlock()

    return currentTick - now
  }

  return <A extends unknown[], R>(function_: (...args: A) => Promise<R>) => {
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    const throttled = (...arguments_: A): Promise<R> => {
      return new Promise((resolve, reject) => {
        const execute = () => {
          // eslint-disable-next-line prefer-spread
          function_.apply(null, arguments_).then(resolve, reject)
        }

        windowedDelay()
          .then((delay) => {
            if (delay > 0) {
              setTimeout(execute, delay)
              onDelay?.({ delay, args: arguments_ })
            } else {
              execute()
            }
          })
          .catch(reject)
      })
    }

    return throttled
  }
}

function validateConfig(config: ThrottleConfig) {
  if (!Number.isInteger(config.limit) || config.limit < 1) {
    throw new TypeError('Expected `limit` to be a positive integer')
  }

  if (!Number.isInteger(config.interval) || config.interval < 1) {
    throw new TypeError('Expected `interval` to be a positive integer')
  }

  if (!config.env?.length) {
    throw new Error('`env` name must be defined')
  }
}

type RedisClient = {
  set: (key: string, value: string | number, options?: { PX: number; NX: true }) => Promise<string | null>
  get: (key: string) => Promise<string | null>
  del: (key: string) => Promise<number>
}

type RunEnvironmentProps = 'currentTick' | 'activeCount'

class RunEnvironment {
  config: ThrottleConfig
  values: Map<string, string> = new Map()
  keyPrefix: string
  fallbackLock: boolean = false

  // eslint-disable-next-line require-await
  lock: ReturnType<typeof redisLock> = async (_name: string, timeout = REDIS_LOCK_DEFAULT_TIMEOUT) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Lock timeout'))
      }, timeout)

      const retry = () => {
        if (this.fallbackLock) {
          setTimeout(retry, REDIS_LOCK_DEFAULT_RETRY_DELAY)
        } else {
          this.fallbackLock = true
          resolve(() => {
            this.fallbackLock = false
          })
        }
      }

      retry()
    })
  }

  constructor(config: ThrottleConfig) {
    this.config = config
    this.keyPrefix = `throttle-run-env:${config.env}:`

    if (this.config?.redis) {
      this.lock = redisLock(this.config.redis)
    }
  }

  async getStringValue(key: RunEnvironmentProps): Promise<string | null> {
    if (this.config.redis) {
      return await this.config.redis.get(this.keyPrefix + key)
    } else {
      const value = this.values.get(key)?.toString()

      return value ?? null
    }
  }

  async getNumValue(key: RunEnvironmentProps): Promise<number> {
    let value: string | undefined | null

    if (this.config.redis) {
      value = await this.config.redis.get(this.keyPrefix + key)
    } else {
      value = this.values.get(key)
    }

    return parseInt(value ?? '0')
  }

  async setValue(key: RunEnvironmentProps, value: string | number) {
    if (this.config.redis) {
      await this.config.redis.set(this.keyPrefix + key, value.toString())
    } else {
      this.values.set(key, value.toString())
    }
  }

  async getLock(name: string) {
    return await this.lock(`throttle-run-env:${this.config.env}:${name}`)
  }
}
