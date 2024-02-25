import chalk from 'chalk'
import fs from 'fs'
import { mergeConfigs } from '../parsers'
import { ConfigFile, ConfigFileDatabasesConfig } from '../types'
import { log, logError, logSuccess } from './log'

const isEqual = <T>(a: T[], b: T[]) => JSON.stringify(a?.sort()) === JSON.stringify(b?.sort())

export async function updateConfigFile(configFile: string, dbConfigData: ConfigFileDatabasesConfig) {
  // log(`Updating config file ${chalk.yellow(configFile)}`)

  if (!fs.existsSync(configFile)) {
    logError(`File ${chalk.yellow(configFile)} does not exists. Please generate it with 'init' command.`)
    process.exit(1)
  }

  const userConfigData = readUserConfig(configFile)
  const { mergedConfig, changes } = await mergeConfigs(userConfigData, dbConfigData)
  const numChanges = Object.keys(changes).length

  if (numChanges === 0 && isEqual(mergedConfig.ignore, userConfigData.ignore)) {
    log('No changes detected. Not updating the config file.')
  } else {
    fs.writeFileSync(configFile, JSON.stringify(mergedConfig, null, 2))
    logSuccess('Updated config file.')

    if (numChanges !== 0) {
      log('Changes:', JSON.stringify(changes, null, 2))
    }
  }

  return mergedConfig
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
