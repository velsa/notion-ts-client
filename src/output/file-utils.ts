import * as fs from 'fs'

export function saveContentToFile(content: string, path: string, fileName: string) {
  fs.mkdirSync(path, { recursive: true })
  fs.writeFileSync(`${path}/${fileName}`, content)
}
