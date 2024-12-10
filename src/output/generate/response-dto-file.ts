import { ConfigFilePropertiesConfig } from '../../types'
import { saveContentToFile } from '../file-utils'

export function createResponseDTOFile(opts: {
  dbPath: string
  fileName: string
  dbTypeName: string
  propsConfig: ConfigFilePropertiesConfig
}) {
  const { dbPath, fileName, dbTypeName, propsConfig } = opts
  const imports = getDTOFileImports(dbTypeName)
  const constructorCode = getDTOConstructorFileCode(propsConfig)
  const code = getDTOFileCode(propsConfig)
  const content = `${imports}

export class ${dbTypeName}ResponseDTO {
  __data: ${dbTypeName}Response
  id: ${dbTypeName}Response['id']
  title: ${dbTypeName}Response['title']
  description: ${dbTypeName}Response['description']
  parent: ${dbTypeName}Response['parent']
  createdBy: ${dbTypeName}Response['created_by']
  lastEditedBy: ${dbTypeName}Response['last_edited_by']
  createdTime: ${dbTypeName}Response['created_time']
  lastEditedTime: ${dbTypeName}Response['last_edited_time']
  isInline: ${dbTypeName}Response['is_inline']
  archived: ${dbTypeName}Response['archived']
  url: ${dbTypeName}Response['url']
  publicUrl: ${dbTypeName}Response['public_url']
  properties: ${dbTypeName}PropertiesResponseDTO

  constructor(res: ${dbTypeName}Response) {
    this.__data = res
    this.id = res.id
    this.title = res.title
    this.description = res.description
    this.parent = res.parent
    this.createdBy = res.created_by
    this.lastEditedBy = res.last_edited_by
    this.createdTime = res.created_time
    this.lastEditedTime = res.last_edited_time
    this.isInline = res.is_inline
    this.archived = res.archived
    this.url = res.url
    this.publicUrl = res.public_url
    this.properties = new ${dbTypeName}PropertiesResponseDTO(res.properties)
  }

  get cover() {
    return {
      type: this.__data.cover?.type,
      url: this.__data.cover?.type === 'external' ? this.__data.cover?.external?.url : this.__data.cover?.file?.url,
    }
  }

  get icon() {
    return {
      type: this.__data.icon?.type,
      url:
        this.__data.icon?.type === 'external'
          ? this.__data.icon?.external?.url
          : this.__data.icon?.type === 'file'
            ? this.__data.icon?.file?.url
            : undefined,
      emoji: this.__data.icon?.type === 'emoji' ? this.__data.icon?.emoji : undefined,
    }
  }
}
  
export class ${dbTypeName}PropertiesResponseDTO {
  __props: ${dbTypeName}Response['properties']
  __data

  constructor(props: ${dbTypeName}Response['properties']) {
    this.__props = props
${constructorCode}
  }
${code}
}
`

  saveContentToFile(content, dbPath, fileName)
}

function getDTOFileImports(dbTypeName: string) {
  return `import { ${dbTypeName}Response } from "./types"`
}

function getDTOConstructorFileCode(dbPropsConfig: ConfigFilePropertiesConfig) {
  const content = Object.values(dbPropsConfig).reduce((acc, propConfig) => {
    if (propConfig._type === 'button') {
      return acc
    }

    return acc + `      ${propConfig.varName}: this.__props['${propConfig._name}'],\n`
  }, '')

  return `    this.__data = {
${content}    }`
}

function getDTOFileCode(dbPropsConfig: ConfigFilePropertiesConfig) {
  const content = Object.values(dbPropsConfig).reduce((acc, propConfig) => {
    if (propConfig._type === 'button') {
      return acc
    }

    if (propConfig._type === 'rich_text' || propConfig._type === 'title') {
      acc += `

  get ${propConfig.varName}() {
    return {
      text: this.__props['${propConfig._name}']?.${propConfig._type} ? this.__props['${propConfig._name}'].${propConfig._type}.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['${propConfig._name}']?.${propConfig._type} ? this.__props['${propConfig._name}'].${propConfig._type}.filter((item) => item.href?.length).map((item) => item.href) : [],
      ${propConfig._type}: this.__props['${propConfig._name}']?.${propConfig._type},
    }
  }`
    } else if (propConfig._type === 'multi_select') {
      acc += `
  get ${propConfig.varName}() {
    return {
      values: this.__props['${propConfig._name}']?.${propConfig._type} ? this.__props['${propConfig._name}'].${propConfig._type}.map((item) => item.name) : [],
      ${propConfig._type}: this.__props['${propConfig._name}']?.${propConfig._type},
    }
  }`
    } else if (propConfig._type === 'files') {
      acc += `

  get ${propConfig.varName}() {
    return {
      urls: this.__props['${propConfig._name}'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }
`
    } else {
      acc += `

  get ${propConfig.varName}() {
    return this.__props['${propConfig._name}']?.${propConfig._type}
  }`
    }

    return acc
  }, '')

  return content
}
