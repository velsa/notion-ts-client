import { log, logWarn } from '../cli/log'
import {
  DatabaseObjectResponse,
  DatabasePropertyConfigResponse,
  SearchResponse,
} from '../output/core/types/notion-api.types'
import { ConfigFile, ConfigFileDatabasesConfig, ConfigFilePropertiesConfig } from '../types'
import { normalizeProperty } from './normalize'

export const DEFAULT_READONLY_PROPERTIES = ['id', 'created_time', 'last_edited_time', 'last_edited_by', 'created_by']

export function createConfigFromNotionDatabases(res: SearchResponse, config: ConfigFile): ConfigFileDatabasesConfig {
  log('Parsing Notion databases into config...')

  const databases = res.results.filter((r) => r.object === 'database')
  const dbConfigObject = databases.reduce((dbConfig, db) => {
    const { id, title, properties } = db as DatabaseObjectResponse
    const dbName = title[0]?.plain_text

    if (!dbName) {
      logWarn(`Could not parse database name for database with id: ${id}`)

      return dbConfig
    }

    if (config.ignore?.includes(id)) {
      log(`Ignoring database: ${dbName} (${id})`)

      return dbConfig
    }

    try {
      dbConfig[id] = {
        name: dbName,
        varName: normalizeProperty(dbName),
        pathName: normalizeProperty(dbName, 'kebabCase'),
        properties: remapToConfigProperties(properties),
      }

      return dbConfig
    } catch (err) {
      console.error(`Error parsing database ${dbName} with id: ${id}`, err)

      throw err
    }
  }, {} as ConfigFileDatabasesConfig)

  return dbConfigObject
}

function remapToConfigProperties(properties: Record<string, DatabasePropertyConfigResponse>) {
  const remappedProperties = Object.values(properties).reduce((acc, property) => {
    const { id, name, type } = property
    const varName = normalizeProperty(name)

    return {
      ...acc,
      [id]: {
        name: name.replace(/\\/g, '\\\\'),
        type,
        varName,
        readOnly: DEFAULT_READONLY_PROPERTIES.includes(type),
      },
    }
  }, {} as ConfigFilePropertiesConfig)

  return remappedProperties
}
