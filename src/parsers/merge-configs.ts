/* eslint-disable @typescript-eslint/no-explicit-any */
import { confirm } from '@inquirer/prompts'
import { ConfigFile, ConfigFileDatabasesConfig } from '../types'

interface MergeConfigsResult {
  mergedConfig: ConfigFile
  changes: Record<string, MergeDbConfigResult>
}

interface MergeDbConfigResult {
  name: string
  varName: string
  change?:
    | {
        type: 'renamed'
        oldName: string
        newName: string
      }
    | {
        type: 'added'
      }
    | {
        type: 'removed'
      }
  properties: Record<string, MergePropertyConfigResult>
}

interface MergePropertyConfigResult {
  name: string
  varName: string
  change:
    | {
        type: 'renamed'
        oldName: string
        newName: string
      }
    | {
        type: 'retyped'
        oldType: string
        newType: string
      }
    | {
        type: 'added'
      }
    | {
        type: 'removed'
      }
}

/**
 * add new databases from updated,
 * add new properties from updated,
 * report databases that exist in original and are missing in updated,
 * report properties that exist in original and are missing in updated
 *
 * @param original user config
 * @param updated retrieved from Notion
 * @returns merged config and changes
 */
export async function mergeConfigs(
  original: ConfigFile,
  updatedDbConfigs: ConfigFileDatabasesConfig,
): Promise<MergeConfigsResult> {
  const merged = JSON.parse(JSON.stringify(original)) as ConfigFile
  const mergedDbConfig = merged.databases
  const changes: MergeConfigsResult['changes'] = {}

  for (const [dbId, updatedDbConfig] of Object.entries(updatedDbConfigs)) {
    const dbChange = (value: MergeDbConfigResult['change']) =>
      (changes[dbId] = {
        name: updatedDbConfig._name,
        varName: originalDbConfig?.varName ?? '',
        change: value,
        properties: changes[dbId]?.properties ?? {},
      })
    const originalDbConfig = original.databases[dbId]

    if (originalDbConfig) {
      // Always update the DB name from Notion, read-only prop!
      if (updatedDbConfig._name !== originalDbConfig._name) {
        dbChange({ type: 'renamed', oldName: originalDbConfig._name, newName: updatedDbConfig._name })

        const conf = mergedDbConfig[dbId]

        if (conf) {
          conf._name = updatedDbConfig._name
        }
      }

      for (const [propId, updatedPropConfig] of Object.entries(updatedDbConfig.properties)) {
        const propChange = (change: MergePropertyConfigResult['change']) =>
          (changes[dbId] = changes[dbId]
            ? {
                ...changes[dbId],
                properties: {
                  ...changes[dbId].properties,
                  [propId]: { name: updatedPropConfig._name, varName: updatedPropConfig.varName, change },
                },
              }
            : {
                name: updatedDbConfig._name,
                varName: originalPropConfig?.varName,
                change: undefined,
                properties: {
                  [propId]: { name: updatedPropConfig._name, varName: updatedPropConfig.varName, change },
                },
              })
        const originalPropConfig = originalDbConfig.properties[propId]

        if (originalPropConfig) {
          // Always update the prop name and type from Notion, read-only props!
          if (updatedPropConfig._name !== originalPropConfig._name) {
            propChange({ type: 'renamed', oldName: originalPropConfig._name, newName: updatedPropConfig._name })
          }

          if (updatedPropConfig._type !== originalPropConfig._type) {
            propChange({ type: 'retyped', oldType: originalPropConfig._type, newType: updatedPropConfig._type })
          }

          const conf = mergedDbConfig[dbId]?.properties[propId]

          if (conf) {
            conf._name = updatedPropConfig._name
            conf._type = updatedPropConfig._type
          }
        } else {
          propChange({ type: 'added' })
          if (mergedDbConfig[dbId]) {
            mergedDbConfig[dbId].properties[propId] = updatedPropConfig
          }
        }
      }
    } else {
      if (original.ignore?.some((ignoredDb) => ignoredDb.id === dbId)) {
        continue
      }

      const isAdd = await confirm({
        message: `Add the new database "${updatedDbConfig._name}" (${dbId}) to the config?\n`,
        transformer: (value: boolean) => (value ? 'Yes' : 'No, add to ignore list'),
        default: true,
      })

      if (isAdd) {
        dbChange({ type: 'added' })
        mergedDbConfig[dbId] = updatedDbConfig
      } else {
        if (!merged.ignore) {
          merged.ignore = []
        }

        merged.ignore.push({
          name: updatedDbConfig._name,
          id: dbId,
        })
      }
    }
  }

  for (const [dbId, originalDbConfig] of Object.entries(original.databases)) {
    const dbChange = (change: MergeDbConfigResult['change']) =>
      (changes[dbId] = {
        name: originalDbConfig._name,
        varName: originalDbConfig.varName,
        change,
        properties: changes[dbId]?.properties ?? {},
      })
    const updatedDbConfig = updatedDbConfigs[dbId]

    if (updatedDbConfig) {
      for (const [propId, originalPropConfig] of Object.entries(originalDbConfig.properties)) {
        const propChange = (change: MergePropertyConfigResult['change']) =>
          (changes[dbId] = changes[dbId]
            ? {
                ...changes[dbId],
                properties: {
                  ...changes[dbId].properties,
                  [propId]: { name: originalPropConfig._name, varName: originalPropConfig.varName, change },
                },
              }
            : {
                name: originalDbConfig._name,
                varName: originalDbConfig.varName,
                change: undefined,
                properties: {
                  [propId]: { name: originalPropConfig._name, varName: originalPropConfig.varName, change },
                },
              })

        if (updatedDbConfig.properties[propId] === undefined) {
          propChange({ type: 'removed' })
          delete mergedDbConfig[dbId].properties[propId]
        }
      }
    } else {
      dbChange({ type: 'removed' })
      delete mergedDbConfig[dbId]
    }
  }

  const mergedConfig = { ignore: merged.ignore, databases: mergedDbConfig }

  return {
    mergedConfig,
    changes,
  }
}
