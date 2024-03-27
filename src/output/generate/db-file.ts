import { makeConstVarName } from '../../parsers'
import { normId } from '../core/src/notion-urls'
import { saveContentToFile } from '../file-utils'

export function createDBFile(opts: { dbPath: string; fileName: string; dbTypeName: string; dbId: string }) {
  const { dbPath, fileName, dbTypeName, dbId } = opts
  const constVarName = makeConstVarName(dbTypeName)
  const content = `import { ${dbTypeName}Response, ${dbTypeName}Query, ${dbTypeName}QueryResponse } from './types'
import { ${dbTypeName}PatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { ${constVarName}_PROPS_TO_TYPES, ${constVarName}_PROPS_TO_IDS, ${dbTypeName}DTOProperties } from './constants'

export class ${dbTypeName}Database extends GenericDatabaseClass<
  ${dbTypeName}Response,
  ${dbTypeName}PatchDTO,
  ${dbTypeName}Query,
  ${dbTypeName}QueryResponse,
  ${dbTypeName}DTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '${normId(dbId)}'
  }

  protected queryRemapFilter(filter?: Record<string, unknown>) {
    if (!filter) {
      return undefined
    }

    const notionFilter = {} as any

    Object.entries(filter).forEach(([key, value]) => {
      if (key === 'and' || key === 'or') {
        if (Array.isArray(value)) {
          notionFilter[key] = value.map((v) => this.queryRemapFilter(v))
        } else {
          throw new Error(\`${dbTypeName}: Invalid filter value for \${key}: \${value}\`)
        }
      } else {
        if (!(key in ${constVarName}_PROPS_TO_TYPES)) {
          throw new Error(\`${dbTypeName}: Invalid filter key: \${key}\`)
        }

        const propType = ${constVarName}_PROPS_TO_TYPES[key as keyof typeof ${constVarName}_PROPS_TO_TYPES];
        const propId = ${constVarName}_PROPS_TO_IDS[key as keyof typeof ${constVarName}_PROPS_TO_IDS];

        notionFilter['property'] = propId
        notionFilter[propType] = value
      }
    })
    
    return notionFilter
  }

  protected queryRemapSorts(sorts?: Record<string, string>[]) {
    return sorts?.map((sort) => {
      if ('property' in sort) {
        return {
          property: ${constVarName}_PROPS_TO_IDS[sort.property as keyof typeof ${constVarName}_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => ${constVarName}_PROPS_TO_IDS[p as keyof typeof ${constVarName}_PROPS_TO_IDS])
  }
}
`

  saveContentToFile(content, dbPath, fileName)
}
