import { saveContentToFile } from '../file-utils'

export function createIndexFile(opts: { dbPath: string; fileName: string }) {
  const content = `export * from './constants'
export * from './db'
export * from './patch.dto'
export * from './response.dto'
export * from './types'
`

  saveContentToFile(content, opts.dbPath, opts.fileName)
}
