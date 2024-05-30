import { ConfigFilePropertiesConfig } from '../../types'
import { saveContentToFile } from '../file-utils'

const TYPE_INDENT = '  '
const PATCH_IGNORE_PROPS = ['created_by', 'created_time', 'last_edited_by', 'last_edited_time']

export function createPatchDTOFile(opts: {
  dbPath: string
  fileName: string
  dbTypeName: string
  propsConfig: ConfigFilePropertiesConfig
}) {
  const imports = getDTOFileImports(opts.dbTypeName, opts.propsConfig)
  const type = getDTOFileType(opts.dbTypeName, opts.propsConfig)
  const code = getDTOFileCode(opts.propsConfig)
  const content = `${imports}

export type ${opts.dbTypeName}PropertiesPatch = {
${type}}
type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

  
export class ${opts.dbTypeName}PatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: ${opts.dbTypeName}PropertiesPatch
    coverUrl?: string
    icon?: UpdatePageBodyParameters['icon']
    archived?: UpdatePageBodyParameters['archived']
  }) {
    const { properties: props, coverUrl, icon, archived } = opts

    this.__data = {}
    this.__data.properties = {}
    this.__data.cover = coverUrl ? { type: 'external', external: { url: coverUrl } } : undefined
    this.__data.icon = icon
    this.__data.archived = archived
    ${code}  }
}
`

  saveContentToFile(content, opts.dbPath, opts.fileName)
}

function getDTOFileImports(dbTypeName: string, propsConfig: ConfigFilePropertiesConfig) {
  const imports = Object.values(propsConfig)
    .map((prop) => getImportType(prop._type))
    .filter((i) => i !== undefined)
  const uniqueImports = Array.from(new Set(imports)).sort()

  return (
    `import { ${dbTypeName}Response } from "./types"
import { UpdatePageBodyParameters,\n` +
    uniqueImports.join(',\n') +
    `\n} from '../../core/types/notion-api.types'`
  )
}

function getImportType(type: string) {
  switch (type) {
    case 'title':
    case 'rich_text':
      return 'RichTextItemRequest'
  }
}

function getDTOFileType(dbTypeName: string, dbPropsConfig: ConfigFilePropertiesConfig) {
  const content = Object.values(dbPropsConfig).reduce((acc, propConfig) => {
    let typeValue

    if (
      PATCH_IGNORE_PROPS.includes(propConfig._type) ||
      propConfig.readOnly ||
      ['button', 'rollup'].includes(propConfig._type)
    ) {
      return acc
    }

    if (propConfig._type === 'multi_select') {
      typeValue = `${dbTypeName}Response['properties']['${propConfig._name}']['multi_select'][number]['name'][]`
    } else if (propConfig._type === 'select') {
      typeValue = `${dbTypeName}Response['properties']['${propConfig._name}']['select']['name']`
    } else if (['rich_text', 'title'].includes(propConfig._type)) {
      typeValue = `string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]`
    } else {
      typeValue = `TypeFromRecord<UpdatePageBodyParameters['properties'], { type: '${propConfig._type}' }>['${propConfig._type}']`
    }

    acc += `${TYPE_INDENT}${propConfig.varName}?: ${typeValue}\n`

    return acc
  }, '')

  return content
}

function getDTOFileCode(dbPropsConfig: ConfigFilePropertiesConfig) {
  const content = Object.entries(dbPropsConfig).reduce((acc, [propId, propConfig]) => {
    let objValue

    if (
      PATCH_IGNORE_PROPS.includes(propConfig._type) ||
      propConfig.readOnly ||
      ['button', 'rollup'].includes(propConfig._type)
    ) {
      return acc
    }

    if (propConfig._type === 'multi_select') {
      objValue = `
        type: 'multi_select',
        multi_select: props.${propConfig.varName}?.map((item) => ({ name: item })),`
    } else if (propConfig._type === 'select') {
      objValue = `
        type: 'select',
        select: { name: props.${propConfig.varName} },`
    } else if (['rich_text', 'title'].includes(propConfig._type)) {
      const propsVar = `props.${propConfig.varName}`

      objValue = `
        type: '${propConfig._type}',
        ${propConfig._type}: typeof ${propsVar} === 'string' ? [{ type: 'text', text: { content: ${propsVar} } }] : !Array.isArray(${propsVar}) ? [{ type: 'text', text: { content: ${propsVar}.text, link: ${propsVar}.url ? { url: ${propsVar}.url } : undefined }, annotations: ${propsVar}.annotations }] : ${propsVar},`
    } else {
      objValue = `
        type: '${propConfig._type}',
        ${propConfig._type}: props.${propConfig.varName},`
    }

    acc += `
    if (props?.${propConfig.varName} !== undefined) {
      this.__data.properties['${propId}'] = {${objValue}
      }
    }
`

    return acc
  }, '')

  return content
}
