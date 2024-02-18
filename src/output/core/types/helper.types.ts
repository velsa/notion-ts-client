/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/ban-types */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type DATABASE_PATH_MAX_ARRAY_LENGTH = 3

type Mapped<
  N extends number = DATABASE_PATH_MAX_ARRAY_LENGTH,
  Result extends Array<unknown> = [],
> = Result['length'] extends N ? Result : Mapped<N, [...Result, `${Result['length']}`]>

type StringKeys<T> = Extract<keyof T, string>

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[]
  ? ElementType
  : never

export type PathsToStringProps<T> = T extends unknown[]
  ? ['']
  : T extends string | boolean | number
    ? []
    :
        | ['']
        | {
            [K in StringKeys<T>]: [K, ...PathsToStringProps<T[K]>]
          }[StringKeys<T>]

export type Join<T extends string[], D extends string = '/'> = T extends []
  ? never
  : T extends [infer F]
    ? F
    : T extends [infer F, ...infer R]
      ? F extends string
        ? `${F}${D}${Join<Extract<R, string[]>, D>}`
        : never
      : string

export type TypeByPath<P extends string, T> = P extends `${infer P1}/${infer P2}`
  ? P1 extends keyof T
    ? T[P1] extends ArrayLike<unknown>
      ? P2 extends `${infer P2Index}/${infer P3}`
        ? P2Index extends ArrayElement<Mapped>
          ? TypeByPath<P3, T[P1][0]>
          : never
        : T[P1]
      : TypeByPath<P2, T[P1]>
    : never
  : P extends ''
    ? T
    : P extends keyof T
      ? T[P] extends ArrayLike<unknown>
        ? T[P][0]
        : T[P]
      : never

type OmitDistributive<T, K extends PropertyKey> = T extends any ? (T extends object ? OmitRecursively<T, K> : T) : never
type OmitRecursively<T, K extends PropertyKey> = Omit<{ [P in keyof T]: OmitDistributive<T[P], K> }, K>

// export type NoteMateSlimProperty<T> = OmitRecursively<T, 'id' | 'object'>
