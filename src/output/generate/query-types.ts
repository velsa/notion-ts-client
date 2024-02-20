import { capitalizeVarName, normalizeTypeName } from '../../parsers'
import { ConfigFilePropertiesConfig } from '../../types'

export function getQueryTypes(dbTypeName: string, propsConfig: ConfigFilePropertiesConfig) {
  const customFilterTypes = getCustomFilterTypes(dbTypeName, propsConfig)
  const customPropFilterType = getDBCustomFilterType(dbTypeName, propsConfig)

  return `${customFilterTypes}
${customPropFilterType}

export type ${dbTypeName}Query = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof AFISHA_PROPS_TO_IDS
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

export type ${dbTypeName}QueryResponse = {
  results: ${dbTypeName}Response[]
  next_cursor: string | null
  has_more: boolean
}
`
}

function getDBCustomFilterType(dbTypeName: string, propsConfig: ConfigFilePropertiesConfig) {
  const unionTypes = Object.values(propsConfig).map((prop) => {
    const typePrefix = `${dbTypeName}${normalizeTypeName(prop.varName)}`

    return `{ ${prop.varName}: ${typePrefix}PropertyFilter }`
  })

  return `type ${dbTypeName}PropertyFilter = ${unionTypes.join(' | ')}`
}

function getCustomFilterTypes(dbTypeName: string, propsConfig: ConfigFilePropertiesConfig) {
  return Object.values(propsConfig)
    .map((prop) => {
      const typePrefix = `${dbTypeName}${normalizeTypeName(prop.varName)}`

      switch (prop.type) {
        case 'select':
          return `type ${typePrefix}PropertyFilter =
  | {
      equals: ${dbTypeName}Response['properties']['${prop.name}']['select']['name']
    }
  | {
      does_not_equal: ${dbTypeName}Response['properties']['${prop.name}']['select']['name']
    }
  | ExistencePropertyFilter      
`
        case 'multi_select':
          return `type ${typePrefix}PropertyFilter =
  | {
      contains: ${dbTypeName}Response['properties']['${prop.name}']['multi_select'][number]['name']
    }
  | {
      does_not_contain: ${dbTypeName}Response['properties']['${prop.name}']['multi_select'][number]['name']
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
          return `type ${typePrefix}PropertyFilter = ExistancePropertyFilter`

        case 'unique_id':
          return `type ${typePrefix}PropertyFilter = NumberPropertyFilter`

        default:
          return `type ${typePrefix}PropertyFilter = ${capitalizeVarName(prop.type)}PropertyFilter`
      }
    })
    .join('\n')
}

// ---

export function getQueryFilterTypeImports(propsConfig: ConfigFilePropertiesConfig) {
  const imports = Object.values(propsConfig).map((prop) => getImportType(prop.type))
  const uniqueImports = Array.from(new Set(imports))
    .filter((i) => i !== undefined)
    .sort()

  return (
    `ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
` + uniqueImports.join(',\n')
  )
}

function getImportType(type: string) {
  switch (type) {
    case 'select':
    case 'multi_select':
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
