import { makeConstVarName } from '../../parsers'
import { ConfigFilePropertiesConfig, CustomTypesPropertiesConfig, CustomTypesPropertyConfig } from '../../types'
import { saveContentToFile } from '../file-utils'
import { getQueryFilterTypeImports, getQueryTypes } from './query-types'

const PROPERTIES_INDENT = '    '

export function createTypesFile(opts: {
  dbPath: string
  fileName: string
  dbTypeName: string
  propsConfig: ConfigFilePropertiesConfig
  customPropsConfig: CustomTypesPropertiesConfig
}) {
  const { dbPath, fileName, dbTypeName, propsConfig, customPropsConfig } = opts
  const imports = getTypesFileImports(dbTypeName, propsConfig)
  const properties = getTypesFileProperties(propsConfig, customPropsConfig)
  const queryTypes = getQueryTypes(dbTypeName, propsConfig)
  const content = `import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
${imports}

export interface ${dbTypeName}Response extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
${properties}
  }
}

export type ${dbTypeName}Properties = keyof ${dbTypeName}Response['properties']
export type ${dbTypeName}Path = Join<PathsToStringProps<${dbTypeName}Response>>

${queryTypes}
`

  saveContentToFile(content, dbPath, fileName)
}

function getTypesFileImports(dbTypeName: string, propsConfig: ConfigFilePropertiesConfig) {
  const constVarName = makeConstVarName(dbTypeName)
  const imports = Object.values(propsConfig).map((prop) => getImportType(prop._type))
  const uniqueImports = Array.from(new Set(imports)).sort()

  return (
    `import {\nDatabaseObjectResponse,
StringRequest,
` +
    uniqueImports.join(',\n') +
    ',\n' +
    getQueryFilterTypeImports(propsConfig) +
    `\n} from '../../core/types/notion-api.types'
import { ${constVarName}_PROPS_TO_IDS } from './constants'`
  )
}

function getImportType(type: string) {
  switch (type) {
    case 'number':
      return 'NumberPropertyItemObjectResponse'
    case 'url':
      return 'UrlPropertyItemObjectResponse'
    case 'select':
      return 'SelectPropertyItemObjectResponse'
    case 'multi_select':
      return 'MultiSelectPropertyItemObjectResponse'
    case 'status':
      return 'StatusPropertyItemObjectResponse'
    case 'date':
      return 'DatePropertyItemObjectResponse'
    case 'email':
      return 'EmailPropertyItemObjectResponse'
    case 'phone_number':
      return 'PhoneNumberPropertyItemObjectResponse'
    case 'checkbox':
      return 'CheckboxPropertyItemObjectResponse'
    case 'files':
      return 'FilesPropertyItemObjectResponse'
    case 'created_by':
      return 'CreatedByPropertyItemObjectResponse'
    case 'created_time':
      return 'CreatedTimePropertyItemObjectResponse'
    case 'last_edited_by':
      return 'LastEditedByPropertyItemObjectResponse'
    case 'last_edited_time':
      return 'LastEditedTimePropertyItemObjectResponse'
    case 'formula':
      return 'FormulaPropertyItemObjectResponse'
    case 'unique_id':
      return 'UniqueIdPropertyItemObjectResponse'
    case 'verification':
      return 'VerificationPropertyItemObjectResponse'
    case 'title':
      return 'TitlePropertyItemObjectResponse'
    case 'rich_text':
      return 'RichTextPropertyItemObjectResponse'
    case 'people':
      return 'PeoplePropertyItemObjectResponse'
    case 'relation':
      return 'RelationPropertyItemObjectResponse'
    case 'rollup':
      return 'RollupPropertyItemObjectResponse'
    default:
      throw new Error(`Unknown property type: ${type}`)
  }
}

function getTypesFileProperties(
  propsConfig: ConfigFilePropertiesConfig,
  customPropsConfig: CustomTypesPropertiesConfig,
) {
  const properties = Object.entries(propsConfig)
    .map(
      ([propId, propConfig]) =>
        `${PROPERTIES_INDENT}"${propConfig._name}": ${getPropertyType(propConfig._type, customPropsConfig[propId])}`,
    )
    .join(',\n')

  return properties
}

function getPropertyType(type: string, propConfig?: CustomTypesPropertyConfig) {
  const typesUnion = (propConfig: CustomTypesPropertyConfig) =>
    propConfig?.options
      .map(({ name, color }) => `{ id: StringRequest, name: '${name}', color: '${color}' }`)
      .join(' | ')

  switch (type) {
    case 'select':
      return "Omit<SelectPropertyItemObjectResponse, 'select'> & { select: " + typesUnion(propConfig) + '}'
    case 'multi_select':
      return (
        "Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [" +
        typesUnion(propConfig) +
        ']}'
      )
    case 'status':
      return "Omit<StatusPropertyItemObjectResponse, 'status'> & { status: " + typesUnion(propConfig) + '}'
    default:
      return getImportType(type)
  }
}
