/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigFileDatabasesConfig } from '../types'

interface MergeConfigsResult {
  merged: ConfigFileDatabasesConfig
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
export function mergeConfigs(
  original: ConfigFileDatabasesConfig,
  updated: ConfigFileDatabasesConfig,
): MergeConfigsResult {
  const merged = { ...original }
  const changes: MergeConfigsResult['changes'] = {}

  for (const [dbId, updatedDbConfig] of Object.entries(updated)) {
    const dbChange = (value: MergeDbConfigResult['change']) =>
      (changes[dbId] = {
        name: updatedDbConfig.name,
        varName: originalDbConfig?.varName,
        change: value,
        properties: changes[dbId] ? changes[dbId].properties : {},
      })
    const originalDbConfig = original[dbId]

    if (originalDbConfig) {
      // Always update the DB name from Notion, read-only prop!
      if (updatedDbConfig.name !== originalDbConfig.name) {
        dbChange({ type: 'renamed', oldName: originalDbConfig.name, newName: updatedDbConfig.name })
        merged[dbId].name = updatedDbConfig.name
      }

      for (const [propId, updatedPropConfig] of Object.entries(updatedDbConfig.properties)) {
        const propChange = (change: MergePropertyConfigResult['change']) =>
          (changes[dbId] = changes[dbId]
            ? {
                ...changes[dbId],
                properties: {
                  ...changes[dbId].properties,
                  [propId]: { name: updatedPropConfig.name, varName: updatedPropConfig.varName, change },
                },
              }
            : {
                name: updatedDbConfig.name,
                varName: originalPropConfig?.varName,
                change: undefined,
                properties: {
                  [propId]: { name: updatedPropConfig.name, varName: updatedPropConfig.varName, change },
                },
              })
        const originalPropConfig = originalDbConfig.properties[propId]

        if (originalPropConfig) {
          // Always update the prop name and type from Notion, read-only props!
          if (updatedPropConfig.name !== originalPropConfig.name) {
            propChange({ type: 'renamed', oldName: originalPropConfig.name, newName: updatedPropConfig.name })
          }

          if (updatedPropConfig.type !== originalPropConfig.type) {
            propChange({ type: 'retyped', oldType: originalPropConfig.type, newType: updatedPropConfig.type })
          }

          merged[dbId].properties[propId].name = updatedPropConfig.name
          merged[dbId].properties[propId].type = updatedPropConfig.type
        } else {
          propChange({ type: 'added' })
          merged[dbId].properties[propId] = updatedPropConfig
        }
      }
    } else {
      dbChange({ type: 'added' })
      merged[dbId] = updatedDbConfig
    }
  }

  for (const [dbId, originalDbConfig] of Object.entries(original)) {
    const dbChange = (change: MergeDbConfigResult['change']) =>
      (changes[dbId] = {
        name: originalDbConfig.name,
        varName: originalDbConfig.varName,
        change,
        properties: changes[dbId] ? changes[dbId].properties : {},
      })
    const updatedDbConfig = updated[dbId]

    if (updatedDbConfig) {
      for (const [propId, originalPropConfig] of Object.entries(originalDbConfig.properties)) {
        const propChange = (change: MergePropertyConfigResult['change']) =>
          (changes[dbId] = changes[dbId]
            ? {
                ...changes[dbId],
                properties: {
                  ...changes[dbId].properties,
                  [propId]: { name: originalPropConfig.name, varName: originalPropConfig.varName, change },
                },
              }
            : {
                name: originalDbConfig.name,
                varName: originalDbConfig.varName,
                change: undefined,
                properties: {
                  [propId]: { name: originalPropConfig.name, varName: originalPropConfig.varName, change },
                },
              })

        if (updatedDbConfig.properties[propId] === undefined) {
          propChange({ type: 'removed' })
        }
      }
    } else {
      dbChange({ type: 'removed' })
    }
  }

  return {
    merged,
    changes,
  }
}
