import chalk from 'chalk'
import fs from 'fs'
import { confirmNewDatabases, mergeDatabaseConfigs, moveDefaultReadOnlyPropertiesToTheEnd } from '../parsers'
import { ConfigFile, ConfigFileDatabasesConfig } from '../types'
import { log, logError, logSuccess, logWarn } from './log'

const isEqual = <T>(a?: T[], b?: T[]) => JSON.stringify(a?.sort()) === JSON.stringify(b?.sort())
const defaultConfig: ConfigFile = { ignore: [], databases: {} }

export async function updateConfigFile(configFile: string, dbConfigData: ConfigFileDatabasesConfig) {
  if (!fs.existsSync(configFile)) {
    logError(`File ${chalk.yellow(configFile)} does not exists, will not update.`)
    process.exit(1)
  }

  const userConfig = readUserConfig(configFile)
  const newConfig = await confirmNewDatabases(userConfig, { databases: dbConfigData })
  const { mergedDbConfigs, changes } = await mergeDatabaseConfigs(userConfig.databases, newConfig.databases)
  const numChanges = Object.keys(changes).length

  moveDefaultReadOnlyPropertiesToTheEnd(mergedDbConfigs)

  const resultConfig = { ignore: newConfig.ignore, databases: mergedDbConfigs }

  if (
    numChanges !== 0 ||
    !isEqual(
      resultConfig.ignore?.map((i) => i.id),
      userConfig.ignore?.map((i) => i.id),
    )
  ) {
    fs.writeFileSync(configFile, JSON.stringify(resultConfig, null, 2))
    logSuccess('Updated config file.')

    if (numChanges !== 0) {
      log('Changes:', JSON.stringify(changes, null, 2))
    }
  } else {
    log('No changes detected. Not updating the config file.')
  }

  return resultConfig
}

export function readUserConfig(configPath: string) {
  let userConfig: string

  if (!fs.existsSync(configPath)) {
    logWarn(`File ${chalk.yellow(configPath)} does not exists. Creating it...`)
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2))

    return defaultConfig
  }

  try {
    userConfig = fs.readFileSync(configPath, 'utf8')
  } catch (err) {
    logError(`Failed reading ${chalk.yellow(configPath)}.`, err)
    process.exit(1)
  }

  try {
    const userConfigData = JSON.parse(userConfig) as ConfigFile

    if (!userConfigData.databases) {
      logWarn(`File ${chalk.yellow(configPath)} is invalid, will overwrite...`)

      return defaultConfig
    }

    return userConfigData
  } catch (err) {
    logError(`Error parsing ${chalk.yellow(configPath)}.`, err)
    process.exit(1)
  }
}
