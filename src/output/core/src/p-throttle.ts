import { createClient } from 'redis'
export interface ThrottleConfig {
  // The name of the environment, all throttled functions with the same `env` name share the same rate limit
  env: string
  // The maximum number of calls allowed within the interval
  limit: number
  // The length of the interval (window) in milliseconds
  interval: number
  // The Redis URL to use for environment state storage
  redisUrl?: string
  // The Redis database number to use for environment state storage
  redisDb?: number
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

  function windowedDelay() {
    const env = runEnvs[config.env] as RunEnvironment
    const now = Date.now()
    let currentTick = parseInt(env.getValue('currentTick') ?? '0')
    const activeCount = parseInt(env.getValue('activeCount') ?? '0')

    // console.log('currentTick', currentTick, 'activeCount', activeCount, 'now', now)

    if (now - currentTick > interval) {
      env.setValue('currentTick', now)
      env.setValue('activeCount', 1)

      return 0
    }

    if (activeCount < limit) {
      env.setValue('activeCount', activeCount + 1)
    } else {
      currentTick += interval
      env.setValue('currentTick', currentTick)
      env.setValue('activeCount', 1)
    }

    // console.log('delay', currentTick - now)

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
        const delay = windowedDelay()

        if (delay > 0) {
          setTimeout(execute, delay)
          onDelay?.({ delay, args: arguments_ })
        } else {
          execute()
        }
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

type RunEnvironmentProps = 'currentTick' | 'activeCount'

class RunEnvironment {
  config: ThrottleConfig
  values: Map<string, string>
  keyPrefix: string
  redis: ReturnType<typeof createClient> | null = null

  constructor(config: ThrottleConfig) {
    this.config = config
    this.keyPrefix = `throttle-run-env:${config.env}:`
    this.values = new Map()
    this.setValue('currentTick', 0)
    this.setValue('activeCount', 0)
  }

  async connect() {
    if (!this.config?.redisUrl) {
      throw new Error('ThrottleRunEnvironment: Redis URL is not provided')
    }

    this.redis = await createClient({
      url: this.config.redisUrl,
      pingInterval: 1000,
      database: this.config.redisDb,
    })
      .on('error', (err) => console.error('ThrottleRunEnvironment: Redis Client Error:', err))
      .connect()
  }

  getValue(key: RunEnvironmentProps) {
    if (this.redis) {
      // this.redis.get(this.keyPrefix + key).then((value) => value?.toString())
    } else {
      return this.values.get(key)?.toString()
    }
  }

  setValue(key: RunEnvironmentProps, value: string | number) {
    if (this.redis) {
      // await this.redis.set(this.keyPrefix + key, value.toString())
    } else {
      this.values.set(key, value.toString())
    }
  }
}
