import { createConfigFromNotionDatabases } from '../parsers'
import { generateClients } from './generate-clients'
import { fetchNotionDatabases } from './notion-api'
import { ProgramOptions } from './types'
import { updateConfigFile } from './update-config'

export async function generateTypescriptClients(options: ProgramOptions) {
  const notionResJSON = await fetchNotionDatabases(options.secret)
  const dbConfigData = createConfigFromNotionDatabases(notionResJSON)
  const mergedConfigFile = updateConfigFile(options.config, dbConfigData)

  generateClients(options.sdk, notionResJSON, mergedConfigFile)
}
