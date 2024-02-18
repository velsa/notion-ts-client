import fs from 'fs'
import { DEFAULT_READONLY_PROPERTIES, createConfigFromNotionDatabases } from '../parsers'
import { ConfigFileDatabasesConfig } from '../types'
import { fetchNotionDatabases } from './notion-api'
import { ProgramOptions } from './types'

export async function initConfigFile(options: ProgramOptions) {
  console.log(`------------------ GENERATING ${options.config} ------------------`)

  if (fs.existsSync(options.config)) {
    console.error(`File ${options.config} already exists.`)
    process.exit(1)
  }

  const notionResJSON = await fetchNotionDatabases(options.secret)
  const dbConfigData = createConfigFromNotionDatabases(notionResJSON)

  moveDefaultReadOnlyPropertiesToTheEnd(dbConfigData)

  const fileConfig = {
    databases: dbConfigData,
  }

  fs.writeFileSync(options.config, JSON.stringify(fileConfig, null, 2))
  console.log('Generated config file:', options.config)
  console.log(
    'You can now edit this file and change the "varName" and "readOnly" properties for databases and properties to your liking.',
  )
  console.log(
    "When you run 'generate' command, your Typescript Client will be generated with custom var names and types as specified in the config file.",
  )
}

export function moveDefaultReadOnlyPropertiesToTheEnd(dbConfigs: ConfigFileDatabasesConfig) {
  for (const dbConfig of Object.values(dbConfigs)) {
    const readOnlyProps = Object.entries(dbConfig.properties).filter(([, propConfig]) =>
      DEFAULT_READONLY_PROPERTIES.includes(propConfig.type),
    )

    for (const [propId, propConfig] of readOnlyProps) {
      delete dbConfig.properties[propId]
      dbConfig.properties[propId] = propConfig
    }
  }
}
