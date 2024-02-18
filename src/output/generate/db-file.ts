import * as changeCase from 'change-case-all'
import { saveContentToFile } from '../file-utils'

export function createDBFile(opts: { dbPath: string; fileName: string; dbTypeName: string; dbId: string }) {
  const { dbPath, fileName, dbTypeName, dbId } = opts
  const constVarName = changeCase.constantCase(dbTypeName)
  const content = `import { ${dbTypeName}Response, ${dbTypeName}Query, ${dbTypeName}QueryResponse } from './types'
import { ${dbTypeName}PatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { ${constVarName}_PROPS_TO_TYPES, ${constVarName}_PROPS_TO_IDS } from './constants'

export class ${dbTypeName}Database extends GenericDatabaseClass<
  ${dbTypeName}Response,
  ${dbTypeName}PatchDTO,
  ${dbTypeName}Query,
  ${dbTypeName}QueryResponse
> {
  notionDatabaseId: string

  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '${dbId}'
  }

  queryRemapFilter(filter: Record<string, unknown>) {
    const notionFilter = {}

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

        const propType = ${constVarName}_PROPS_TO_TYPES[key];
        const propId = ${constVarName}_PROPS_TO_IDS[key];

        notionFilter['property'] = propId
        notionFilter[propType] = value
      }
    })
    
    return notionFilter
  }

  queryRemapSorts(sorts: Record<string, string>[]) {
    return sorts?.map((sort) => {
      if ('property' in sort) {
        return {
          property: ${constVarName}_PROPS_TO_IDS[sort.property],
          direction: sort.direction,
        }
      }

      return sort
    })
  }
}
`

  saveContentToFile(content, dbPath, fileName)
}
