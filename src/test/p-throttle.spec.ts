import { createClient } from 'redis'
import pThrottle from '../output/core/src/p-throttle'

const asyncWork = async (name: string, duration: number = 0): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (duration < 0) {
      setTimeout(() => reject(), -duration)
    } else {
      setTimeout(() => resolve(name), duration)
    }
  })
}

describe('p-throttle', () => {
  it('should work WITHOUT redis', async () => {
    const throttledAsyncWork = (logName: string) => {
      return pThrottle({
        env: 'test',
        limit: 1,
        interval: 1000,
        onDelay: ({ delay, args }) => {
          console.log(`${logName}: reached rate limit, delayed for ${delay}ms,`, args)
        },
      })(asyncWork)
    }
    const start = Date.now()
    const throttledAsyncWorkWithLogs = throttledAsyncWork('test')
    const results = await Promise.all([
      throttledAsyncWorkWithLogs('foo', 300),
      throttledAsyncWorkWithLogs('bar', 400),
      throttledAsyncWorkWithLogs('baz', 1300),
      throttledAsyncWorkWithLogs('qux', 0),
    ])

    expect(results).toEqual(['foo', 'bar', 'baz', 'qux'])
    expect(Date.now() - start).toBeGreaterThanOrEqual(2000)
  })

  it('should work WITH redis', async () => {
    const redis = await createClient({
      url: 'redis://localhost:6379',
      pingInterval: 1000,
      database: 3,
    })
      .on('error', (err) => console.error('Redis Client Error:', err))
      .connect()
    const throttledAsyncWork = (logName: string) => {
      return pThrottle({
        env: 'redis-test',
        limit: 2,
        interval: 1000,
        redis,
        onDelay: ({ delay, args }) => {
          console.log(`${logName}: reached rate limit, delayed for ${delay}ms,`, args)
        },
      })(asyncWork)
    }
    const start = Date.now()
    const throttledAsyncWorkWithLogs = throttledAsyncWork('redis test')
    const results = await Promise.all([
      throttledAsyncWorkWithLogs('foo', 300),
      throttledAsyncWorkWithLogs('bar', 400),
      throttledAsyncWorkWithLogs('baz', 1300),
      throttledAsyncWorkWithLogs('qux', 0),
      throttledAsyncWorkWithLogs('quux', 0),
      throttledAsyncWorkWithLogs('quuz', 0),
      throttledAsyncWorkWithLogs('corge', 0),
    ])

    expect(results).toEqual(['foo', 'bar', 'baz', 'qux', 'quux', 'quuz', 'corge'])
    expect(Date.now() - start).toBeGreaterThanOrEqual(2000)
  })
})
