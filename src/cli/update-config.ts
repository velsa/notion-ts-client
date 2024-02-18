import fs from 'fs'
import { mergeConfigs } from '../parsers'
import { ConfigFile, ConfigFileDatabasesConfig } from '../types'

export function updateConfigFile(configFile: string, dbConfigData: ConfigFileDatabasesConfig) {
  console.log(`------------------ UPDATING ${configFile} ------------------`)

  if (!fs.existsSync(configFile)) {
    console.error(`File ${configFile} does not exists. Please generate it with 'init' command.`)
    process.exit(1)
  }

  const userConfigData = readUserConfig(configFile)
  const { merged, changes } = mergeConfigs(userConfigData.databases, dbConfigData)

  userConfigData.databases = merged

  const numChanges = Object.keys(changes).length

  if (numChanges === 0) {
    console.log('No changes detected. Not updating config file.')
  } else {
    fs.writeFileSync(configFile, JSON.stringify(userConfigData, null, 2))
    console.log('Updated config file:', configFile)
    console.log('Changes:', JSON.stringify(changes, null, 2))
  }

  return userConfigData
}

export function readUserConfig(configPath: string) {
  let userConfig: string

  try {
    userConfig = fs.readFileSync(configPath, 'utf8')
  } catch (err) {
    console.error(`Failed reading config file ${configPath}`, err)
    process.exit(1)
  }

  let userConfigData = {} as ConfigFile

  try {
    userConfigData = JSON.parse(userConfig)
  } catch (err) {
    console.error(`Error parsing ${configPath}:`, err)
    process.exit(1)
  }

  return userConfigData
}
