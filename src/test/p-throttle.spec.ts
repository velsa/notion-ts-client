import pThrottle, { ThrottleConfig } from '../output/core/src/p-throttle'

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
  const throttleConfig: ThrottleConfig = {
    env: 'test',
    limit: 1,
    interval: 1000,
  }

  beforeAll(() => {})

  it('should work', async () => {
    // const throttledAsyncWork = pThrottle({
    const throttledAsyncWork = (logName: string) =>
      pThrottle({
        ...throttleConfig,
        onDelay: ({ delay, args }) => {
          console.log(`${logName}: reached rate limit, delayed for ${delay}ms,`, args)
        },
      })(asyncWork)
    const start = Date.now()
    const results = await Promise.all([
      throttledAsyncWork('foo')('foo', 300),
      throttledAsyncWork('bar')('bar', 400),
      throttledAsyncWork('baz')('baz', 1300),
      throttledAsyncWork('qux')('qux', 0),
    ])

    expect(results).toEqual(['foo', 'bar', 'baz', 'qux'])
    expect(Date.now() - start).toBeGreaterThanOrEqual(2000)
  })

  it('should work with `strict` option', async () => {
    const throttledAsyncWork = (logName: string) =>
      pThrottle({
        ...throttleConfig,
        onDelay: ({ delay, args }) => {
          console.log(`${logName}: delayed for ${delay}ms,`, args)
        },
      })(asyncWork)
    const start = Date.now()
    const results = await Promise.all([
      throttledAsyncWork('foo')('foo', 300),
      throttledAsyncWork('bar')('bar', 400),
      throttledAsyncWork('baz')('baz', 1300),
      throttledAsyncWork('qux')('qux', 0),
    ]).catch((err) => {
      console.error(err)
    })

    expect(results).toEqual(['foo', 'bar', 'baz', 'qux'])
    expect(Date.now() - start).toBeGreaterThanOrEqual(2000)
  })
})
