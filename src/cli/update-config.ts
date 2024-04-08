import chalk from 'chalk'
import fs from 'fs'
import { confirmNewDatabases, mergeDatabaseConfigs, moveDefaultReadOnlyPropertiesToTheEnd } from '../parsers'
import { ConfigFile, ConfigFileDatabasesConfig } from '../types'
import { log, logError, logSuccess } from './log'

const isEqual = <T>(a?: T[], b?: T[]) => JSON.stringify(a?.sort()) === JSON.stringify(b?.sort())

export async function updateConfigFile(configFile: string, dbConfigData: ConfigFileDatabasesConfig) {
  if (!fs.existsSync(configFile)) {
    logError(`File ${chalk.yellow(configFile)} does not exists. Please generate it with 'init' command.`)
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

  try {
    userConfig = fs.readFileSync(configPath, 'utf8')
  } catch (err) {
    logError(`Failed reading ${chalk.yellow(configPath)}.`)
    console.error(err)
    process.exit(1)
  }

  let userConfigData = {} as ConfigFile

  try {
    userConfigData = JSON.parse(userConfig)
  } catch (err) {
    logError(`Error parsing ${chalk.yellow(configPath)}.`)
    console.error(err)
    process.exit(1)
  }

  return userConfigData
}
