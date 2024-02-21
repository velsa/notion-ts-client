import { createConfigFromNotionDatabases } from '../parsers'
import { generateClients } from './generate-clients'
import { logSubtle } from './log'
import { fetchNotionDatabases } from './notion-api'
import { ProgramOptions } from './types'
import { updateConfigFile } from './update-config'

export async function generateTypescriptClients(options: ProgramOptions) {
  logSubtle('Config file')

  const notionResJSON = await fetchNotionDatabases(options.secret)
  const dbConfigData = createConfigFromNotionDatabases(notionResJSON)
  const mergedConfigFile = updateConfigFile(options.config, dbConfigData)

  logSubtle('\nSDK')

  generateClients(options.sdk, notionResJSON, mergedConfigFile)
}
