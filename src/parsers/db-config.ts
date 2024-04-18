import { confirm } from '@inquirer/prompts'
import { log, logError, logWarn } from '../cli/log'
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

    if (config.ignore?.some((ignoredDb) => ignoredDb.id === id)) {
      log(`Ignoring database: ${dbName} (${id})`)

      return dbConfig
    }

    const normalizedDbName = normalizeProperty(dbName)

    if (!normalizedDbName?.length) {
      logError(
        `Could not normalize database name for database ${dbName} (id: ${id}).\nPlease edit the DB name in Notion to make sure it contains at least one english character.`,
      )

      throw new Error(`Could not normalize database name for database ${dbName} (id: ${id})`)
    }

    try {
      dbConfig[id] = {
        _name: dbName,
        varName: normalizeProperty(dbName),
        pathName: normalizeProperty(dbName, 'kebabCase'),
        properties: remapToConfigProperties(properties),
      }

      return dbConfig
    } catch (err) {
      logError(`Error parsing database ${dbName} with id: ${id}`, err)

      throw err
    }
  }, {} as ConfigFileDatabasesConfig)

  return dbConfigObject
}

function remapToConfigProperties(properties: Record<string, DatabasePropertyConfigResponse>) {
  const remappedProperties = Object.values(properties).reduce((acc, property) => {
    const { id, name, type } = property
    const varName = normalizeProperty(name)

    if (!varName?.length) {
      logError(
        `Property: ${name} (id: ${id}, type: ${type}) is normalized into an empty string!\nPlease edit the config file manually to fix the "varName" for this property. Or edit the property name in Notion and make sure it contains at least one english character, then run the command again.`,
      )
    }

    return {
      ...acc,
      [id]: {
        _name: name.replace(/\\/g, '\\\\'),
        _type: type,
        varName,
        readOnly: DEFAULT_READONLY_PROPERTIES.includes(type),
      },
    }
  }, {} as ConfigFilePropertiesConfig)

  return remappedProperties
}

export function moveDefaultReadOnlyPropertiesToTheEnd(dbConfigs: ConfigFileDatabasesConfig) {
  for (const dbConfig of Object.values(dbConfigs)) {
    const readOnlyProps = Object.entries(dbConfig.properties).filter(([, propConfig]) =>
      DEFAULT_READONLY_PROPERTIES.includes(propConfig._type),
    )

    for (const [propId, propConfig] of readOnlyProps) {
      delete dbConfig.properties[propId]
      dbConfig.properties[propId] = propConfig
    }
  }
}

export async function confirmNewDatabases(originalConfig: ConfigFile, newConfig: ConfigFile) {
  const resultConfig: ConfigFile = {
    ignore: JSON.parse(JSON.stringify(originalConfig.ignore ?? [])),
    databases: {},
  }

  for (const [dbId, newDbConfig] of Object.entries(newConfig.databases)) {
    if (originalConfig?.databases[dbId]) {
      resultConfig.databases[dbId] = newDbConfig
    } else {
      if (originalConfig?.ignore?.some((ignoredDb) => ignoredDb.id === dbId)) {
        continue
      }

      logWarn(`New database found: ${newDbConfig._name} (${dbId})`)

      const isAdd = await confirm({
        message: `Add the new database "${newDbConfig._name}" (${dbId}) to the config?\n`,
        transformer: (value: boolean) => (value ? 'Yes' : 'No, add to ignore list'),
        default: true,
      })

      if (isAdd) {
        resultConfig.databases[dbId] = newDbConfig
      } else {
        if (!resultConfig.ignore) {
          resultConfig.ignore = []
        }

        resultConfig.ignore.push({
          name: newDbConfig._name,
          id: dbId,
        })
      }
    }
  }

  return resultConfig
}
