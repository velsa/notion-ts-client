import { DatabaseObjectResponse, SearchResponse } from '../output/core/types/notion-api.types'
import { ConfigFileDatabasesConfig } from '../types'
import { CustomTypesConfig, CustomTypesPropertiesConfig, CustomTypesPropertyConfig } from '../types/custom-types'

export function createCustomConfigFromNotionDatabases(
  res: SearchResponse,
  databases: ConfigFileDatabasesConfig,
): CustomTypesConfig {
  const notionDatabases = res.results.filter((r) => r.object === 'database')
  const dbCustomConfig = Object.entries(databases).reduce((dbCustomConfig, [dbId, dbConfig]) => {
    const { properties } = dbConfig
    const notionDbConfig = notionDatabases.find((db) => db.id === dbId) as DatabaseObjectResponse
    const customProperties = Object.entries(properties).reduce((propConfig, [propId, prop]) => {
      const notionPropConfig = Object.values(notionDbConfig.properties).find((p) => p.id === propId)

      if (!notionPropConfig) {
        console.warn(`Property ${prop._name} is missing in Notion database ${dbConfig._name}`)

        return propConfig
      }

      const addProp = (
        type: string,
        options: CustomTypesPropertyConfig['options'],
        groups?: CustomTypesPropertyConfig['groups'],
      ) => {
        propConfig[propId] = {
          type,
          name: prop._name,
          varName: prop.varName,
          options,
          groups,
        }
      }

      if (notionPropConfig.type === 'select') {
        addProp(
          'select',
          notionPropConfig.select.options.map((option) => ({ name: option.name, color: option.color })),
        )
      }

      if (notionPropConfig.type === 'multi_select') {
        addProp(
          'multi_select',
          notionPropConfig.multi_select.options.map((option) => ({ name: option.name, color: option.color })),
        )
      }

      if (notionPropConfig.type === 'status') {
        addProp(
          'status',
          notionPropConfig.status.options.map((option) => ({ name: option.name, color: option.color })),
          notionPropConfig.status.groups.map((group) => ({ name: group.name, optionIds: group.option_ids })),
        )
      }

      return propConfig
    }, {} as CustomTypesPropertiesConfig)

    dbCustomConfig[dbId] = customProperties

    return dbCustomConfig
  }, {} as CustomTypesConfig)

  return dbCustomConfig
}
