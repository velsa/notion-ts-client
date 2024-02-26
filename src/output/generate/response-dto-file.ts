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
  const code = getDTOFileCode(propsConfig)
  const content = `${imports}

export class ${dbTypeName}ResponseDTO {
  id: ${dbTypeName}Response['id']
  title: ${dbTypeName}Response['title']
  description: ${dbTypeName}Response['description']
  icon: ${dbTypeName}Response['icon']
  cover: ${dbTypeName}Response['cover']
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
    this.id = res.id
    this.title = res.title
    this.description = res.description
    this.icon = res.icon
    this.cover = res.cover
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
}
  
export class ${dbTypeName}PropertiesResponseDTO {
  private props: ${dbTypeName}Response['properties']

  constructor(props: ${dbTypeName}Response['properties']) {
    this.props = props
  }
${code}
}
`

  saveContentToFile(content, dbPath, fileName)
}

function getDTOFileImports(dbTypeName: string) {
  return `import { ${dbTypeName}Response } from "./types"`
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
      text: this.props['${propConfig._name}']?.${propConfig._type} ? this.props['${propConfig._name}'].${propConfig._type}.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.props['${propConfig._name}']?.${propConfig._type} ? this.props['${propConfig._name}'].${propConfig._type}.filter((item) => item.href?.length).map((item) => item.href) : [],
      ${propConfig._type}: this.props['${propConfig._name}']?.${propConfig._type},
    }
  }`
    } else if (propConfig._type === 'multi_select') {
      acc += `
  get ${propConfig.varName}() {
    return {
      values: this.props['${propConfig._name}']?.${propConfig._type} ? this.props['${propConfig._name}'].${propConfig._type}.map((item) => item.name) : [],
      ${propConfig._type}: this.props['${propConfig._name}']?.${propConfig._type},
    }
  }`
    } else {
      acc += `

  get ${propConfig.varName}() {
    return this.props['${propConfig._name}']?.${propConfig._type}
  }`
    }

    return acc
  }, '')

  return content
}
