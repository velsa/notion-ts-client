import { createConfigFromNotionDatabases } from '../parsers'
import { generateClients } from './generate-clients'
import { logSubtle } from './log'
import { fetchNotionDatabases } from './notion-api'
import { ProgramOptions } from './types'
import { readUserConfig, updateConfigFile } from './update-config'

export async function generateTypescriptClients(options: ProgramOptions) {
  logSubtle('Config file')

  const userConfigData = readUserConfig(options.config)
  const notionResJSON = await fetchNotionDatabases(options.secret)
  const dbConfigData = createConfigFromNotionDatabases(notionResJSON, userConfigData)
  const mergedConfig = await updateConfigFile(options.config, dbConfigData)

  logSubtle('\nSDK')

  generateClients(options.sdk, notionResJSON, mergedConfig)
}
