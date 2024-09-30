import { capitalizeVarName, makeConstVarName, makeTypeName } from '../../parsers'
import { ConfigFilePropertiesConfig } from '../../types'

export function getQueryTypes(dbTypeName: string, propsConfig: ConfigFilePropertiesConfig) {
  const constVarName = makeConstVarName(dbTypeName)
  const customFilterTypes = getCustomFilterTypes(dbTypeName, propsConfig)
  const customPropFilterType = getDBCustomFilterType(dbTypeName, propsConfig)

  return `${customFilterTypes}

${customPropFilterType}

export type ${dbTypeName}Query = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof ${constVarName}_PROPS_TO_IDS
      direction: 'ascending' | 'descending'
    }
  | {
      timestamp: 'created_time' | 'last_edited_time'
      direction: 'ascending' | 'descending'
    }
  >
  filter?:
    | {
        or: Array<
          | ${dbTypeName}PropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: ${dbTypeName}Query['filter']
              or: Array<${dbTypeName}PropertyFilter>
            }
          | {
              // and: ${dbTypeName}Query['filter']
              and: Array<${dbTypeName}PropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | ${dbTypeName}PropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: ${dbTypeName}Query['filter']
              or: Array<${dbTypeName}PropertyFilter>
            }
          | {
              // and: ${dbTypeName}Query['filter']
              and: Array<${dbTypeName}PropertyFilter>
            }
        >
      }
    | ${dbTypeName}PropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type ${dbTypeName}QueryFilter = ${dbTypeName}Query['filter']

export type ${dbTypeName}QueryResponse = {
  results: ${dbTypeName}Response[]
  next_cursor: string | null
  has_more: boolean
}
`
}

function getDBCustomFilterType(dbTypeName: string, propsConfig: ConfigFilePropertiesConfig) {
  const unionTypes = Object.values(propsConfig)
    .map((prop) => {
      if (prop._type === 'button') {
        return
      }

      const typePrefix = `${dbTypeName}${makeTypeName(prop.varName)}`

      return `{ ${prop.varName}: ${typePrefix}PropertyFilter }`
    })
    .filter((t) => t !== undefined)

  return `export type ${dbTypeName}PropertyFilter = ${unionTypes.join(' | ')}`
}

function getCustomFilterTypes(dbTypeName: string, propsConfig: ConfigFilePropertiesConfig) {
  return Object.values(propsConfig)
    .map((prop) => {
      const typePrefix = `${dbTypeName}${makeTypeName(prop.varName.replace(/_/g, ' '))}`

      switch (prop._type) {
        case 'status':
        case 'select':
          let exportStr

          if (prop._name === 'Created by') {
            exportStr = `export type ${typePrefix}PropertyType = NonNullable<${dbTypeName}Response['properties']['${prop._name}']['${prop._type}']>['name']`
          } else {
            exportStr = `export type ${typePrefix}PropertyType = ${dbTypeName}Response['properties']['${prop._name}']['${prop._type}']['name']`
          }

          return `\n${exportStr}

type ${typePrefix}PropertyFilter =
  | {
      equals: ${typePrefix}PropertyType
    }
  | {
      does_not_equal: ${typePrefix}PropertyType
    }
  | ExistencePropertyFilter      
`
        case 'multi_select':
          return `\nexport type ${typePrefix}PropertyType = ${dbTypeName}Response['properties']['${prop._name}']['multi_select'][number]['name']

type ${typePrefix}PropertyFilter =
  | {
      contains: ${typePrefix}PropertyType
    }
  | {
      does_not_contain: ${typePrefix}PropertyType
    }          
  | ExistencePropertyFilter
`
        case 'title':
        case 'rich_text':
        case 'url':
        case 'email':
        case 'phone_number':
          return `type ${typePrefix}PropertyFilter = TextPropertyFilter`

        case 'created_by':
        case 'last_edited_by':
          return `type ${typePrefix}PropertyFilter = PeoplePropertyFilter`

        case 'created_time':
        case 'last_edited_time':
          return `type ${typePrefix}PropertyFilter = DatePropertyFilter`

        case 'files':
          return `type ${typePrefix}PropertyFilter = ExistencePropertyFilter`

        case 'unique_id':
          return `type ${typePrefix}PropertyFilter = NumberPropertyFilter`

        case 'button':
          return

        default:
          return `type ${typePrefix}PropertyFilter = ${capitalizeVarName(prop._type)}PropertyFilter`
      }
    })
    .filter((t) => t !== undefined)
    .join('\n')
}

// ---

export function getQueryFilterTypeImports(propsConfig: ConfigFilePropertiesConfig) {
  const imports = Object.values(propsConfig)
    .map((prop) => getQueryImportType(prop._type))
    .filter((i) => i !== undefined)
  const uniqueImports = Array.from(new Set(imports)).sort()

  return (
    `ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
` + uniqueImports.join(',\n')
  )
}

function getQueryImportType(type: string) {
  switch (type) {
    case 'select':
    case 'multi_select':
    case 'button':
    case 'files':
      return

    case 'title':
    case 'rich_text':
    case 'url':
    case 'email':
    case 'phone_number':
      return `TextPropertyFilter`

    case 'created_by':
    case 'last_edited_by':
      return `PeoplePropertyFilter`

    case 'created_time':
    case 'last_edited_time':
      return `DatePropertyFilter`

    case 'unique_id':
      return `NumberPropertyFilter`

    case 'status':
      return

    default:
      return `${capitalizeVarName(type)}PropertyFilter`
  }
}

// TODO: implement?
// export type AfishaWebHookOptions =
//   | {
//       trigger: 'prop-updated'
//       properties: Array<keyof typeof AFISHA_PROP_VALUES>
//     }
//   | {
//       trigger: 'page-updated' | 'page-added' | 'page-removed'
//     }
