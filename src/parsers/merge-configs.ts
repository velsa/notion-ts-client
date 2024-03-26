/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigFileDatabasesConfig } from '../types'

interface MergeConfigsResult {
  mergedDbConfigs: ConfigFileDatabasesConfig
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
export async function mergeDatabaseConfigs(
  originalDbConfigs: ConfigFileDatabasesConfig,
  updatedDbConfigs: ConfigFileDatabasesConfig,
): Promise<MergeConfigsResult> {
  const mergedDbConfigs = JSON.parse(JSON.stringify(originalDbConfigs)) as ConfigFileDatabasesConfig
  const changes: MergeConfigsResult['changes'] = {}

  for (const [dbId, updatedDbConfig] of Object.entries(updatedDbConfigs)) {
    const dbChange = (value: MergeDbConfigResult['change']) =>
      (changes[dbId] = {
        name: updatedDbConfig._name,
        varName: originalDbConfig?.varName ?? '',
        change: value,
        properties: changes[dbId]?.properties ?? {},
      })
    const originalDbConfig = originalDbConfigs[dbId]

    if (originalDbConfig) {
      // Always update the DB name from Notion, read-only prop!
      if (updatedDbConfig._name !== originalDbConfig._name) {
        dbChange({ type: 'renamed', oldName: originalDbConfig._name, newName: updatedDbConfig._name })

        const conf = mergedDbConfigs[dbId]

        if (conf) {
          conf._name = updatedDbConfig._name
        }
      }

      for (const [propId, updatedPropConfig] of Object.entries(updatedDbConfig.properties)) {
        const originalPropConfig = originalDbConfig.properties[propId]
        const propChange = (change: MergePropertyConfigResult['change']) => {
          const dbChanges = changes[dbId]

          if (dbChanges) {
            dbChanges.properties[propId] = { name: updatedPropConfig._name, varName: updatedPropConfig.varName, change }
          } else {
            changes[dbId] = {
              name: updatedDbConfig._name,
              varName: originalPropConfig?.varName ?? '',
              change: undefined,
              properties: {
                [propId]: { name: updatedPropConfig._name, varName: updatedPropConfig.varName, change },
              },
            }
          }
        }

        if (originalPropConfig) {
          // Always update the prop name and type from Notion, read-only props!
          if (updatedPropConfig._name !== originalPropConfig._name) {
            propChange({ type: 'renamed', oldName: originalPropConfig._name, newName: updatedPropConfig._name })
          }

          if (updatedPropConfig._type !== originalPropConfig._type) {
            propChange({ type: 'retyped', oldType: originalPropConfig._type, newType: updatedPropConfig._type })
          }

          const conf = mergedDbConfigs[dbId]?.properties[propId]

          if (conf) {
            conf._name = updatedPropConfig._name
            conf._type = updatedPropConfig._type
          }
        } else {
          propChange({ type: 'added' })

          const conf = mergedDbConfigs[dbId]

          if (conf) {
            conf.properties[propId] = updatedPropConfig
          }
        }
      }
    } else {
      dbChange({ type: 'added' })
      mergedDbConfigs[dbId] = updatedDbConfig
    }
  }

  for (const [dbId, originalDbConfig] of Object.entries(originalDbConfigs)) {
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
        const propChange = (change: MergePropertyConfigResult['change']) => {
          const dbChanges = changes[dbId]

          if (dbChanges) {
            dbChanges.properties[propId] = {
              name: originalPropConfig._name,
              varName: originalPropConfig.varName,
              change,
            }
          } else {
            changes[dbId] = {
              name: originalDbConfig._name,
              varName: originalDbConfig.varName,
              change: undefined,
              properties: {
                [propId]: { name: originalPropConfig._name, varName: originalPropConfig.varName, change },
              },
            }
          }
        }

        if (updatedDbConfig.properties[propId] === undefined) {
          propChange({ type: 'removed' })
          delete mergedDbConfigs[dbId]?.properties[propId]
        }
      }
    } else {
      dbChange({ type: 'removed' })
      delete mergedDbConfigs[dbId]
    }
  }

  return {
    mergedDbConfigs,
    changes,
  }
}
