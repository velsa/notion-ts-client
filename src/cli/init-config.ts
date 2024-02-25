import chalk from 'chalk'
import fs from 'fs'
import { DEFAULT_READONLY_PROPERTIES, createConfigFromNotionDatabases } from '../parsers'
import { ConfigFile, ConfigFileDatabasesConfig } from '../types'
import { log, logError, logSuccess } from './log'
import { fetchNotionDatabases } from './notion-api'
import { ProgramOptions } from './types'

export async function initConfigFile(options: ProgramOptions) {
  log(`Generating config file ${chalk.yellow(options.config)}`)

  if (fs.existsSync(options.config)) {
    logError('Config file already exists! Not overwriting.')
    process.exit(1)
  }

  const notionResJSON = await fetchNotionDatabases(options.secret)
  const dbConfigData = createConfigFromNotionDatabases(notionResJSON, {} as ConfigFile)

  moveDefaultReadOnlyPropertiesToTheEnd(dbConfigData)

  const fileConfig = {
    databases: dbConfigData,
  }

  log(`Saving databases config...`)
  fs.writeFileSync(options.config, JSON.stringify(fileConfig, null, 2))
  logSuccess('Config file generated!')
  log(
    `\nYou can now edit this file and change the ${chalk.yellow('"varName"')} and ${chalk.yellow('"readOnly"')} ` +
      `config values for databases and properties to your liking. ` +
      `When you run the ${chalk.yellow('generate')} command – ` +
      `your Typescript Client will be generated with custom var names and types as specified in the config file.`,
  )
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
