import * as fs from 'fs'
import * as path from 'path'

export function copyCoreFiles(opts: { fromPath: string; toPath: string }) {
  if (!fs.existsSync(opts.fromPath)) {
    throw new Error(`Path "${opts.fromPath}" does not exist`)
  }

  fs.mkdirSync(opts.toPath, { recursive: true })

  const srcFromPath = path.join(opts.fromPath, 'src')
  const typesFromPath = path.join(opts.fromPath, 'types')
  const srcToPath = path.join(opts.toPath, 'src')
  const typesToPath = path.join(opts.toPath, 'types')

  if (!fs.existsSync(srcToPath)) {
    fs.mkdirSync(srcToPath)
    fs.copyFileSync(path.join(srcFromPath, 'generic-db.ts'), path.join(srcToPath, 'generic-db.ts'))
    fs.copyFileSync(path.join(srcFromPath, 'rate-limit.ts'), path.join(srcToPath, 'rate-limit.ts'))
  }

  if (!fs.existsSync(typesToPath)) {
    fs.mkdirSync(typesToPath)
    fs.copyFileSync(path.join(typesFromPath, 'helper.types.ts'), path.join(typesToPath, 'helper.types.ts'))
    fs.copyFileSync(path.join(typesFromPath, 'notion-api.types.ts'), path.join(typesToPath, 'notion-api.types.ts'))
  }
}
