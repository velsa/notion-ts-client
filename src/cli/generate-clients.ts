import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import {
  copyCoreFiles,
  createConstantsFile,
  createDBFile,
  createIndexFile,
  createPatchDTOFile,
  createResponseDTOFile,
  createTypesFile,
} from '../output'
import { SearchResponse } from '../output/core/types/notion-api.types'
import { createCustomConfigFromNotionDatabases, normalizeTypeName } from '../parsers'
import { ConfigFile } from '../types'
import { log, logSuccess } from './log'

export function generateClients(sdkPath: string, notionResJSON: SearchResponse, userConfigData: ConfigFile) {
  // log('Generating Notion Typescript Client(s) (SDKs)')

  if (fs.existsSync(sdkPath)) {
    fs.rmSync(sdkPath, { recursive: true })
  }

  // Generate custom types and constants for some properties: Select, MultiSelect, Status
  const dbCustomConfig = createCustomConfigFromNotionDatabases(notionResJSON, userConfigData.databases)

  Object.entries(userConfigData.databases).map(([dbId, dbConfig]) => {
    const dbPath = path.join(sdkPath, 'dbs', dbConfig.pathName)
    const dbTypeName = normalizeTypeName(dbConfig.varName)
    const originDir = buildOriginDir(process.argv[1])

    // console.error('runDir', runDir)
    // console.error('originDir', originDir)
    // console.error('originDir', __dirname)

    log(`Generating SDK for database: ${dbConfig._name} in ${chalk.yellow(dbPath)}`)
    createTypesFile({
      dbPath,
      fileName: 'types.ts',
      dbTypeName,
      propsConfig: dbConfig.properties,
      customPropsConfig: dbCustomConfig[dbId],
    })
    createConstantsFile({
      dbPath,
      fileName: 'constants.ts',
      dbVarName: dbConfig.varName,
      propsConfig: dbConfig.properties,
      customPropsConfig: dbCustomConfig[dbId],
    })
    createResponseDTOFile({
      fileName: 'response.dto.ts',
      dbPath,
      dbTypeName,
      propsConfig: dbConfig.properties,
    })
    createPatchDTOFile({
      fileName: 'patch.dto.ts',
      dbPath,
      dbTypeName,
      propsConfig: dbConfig.properties,
    })
    createDBFile({
      fileName: 'db.ts',
      dbPath,
      dbTypeName,
      dbId,
    })
    createIndexFile({
      dbPath,
      fileName: 'index.ts',
    })
    copyCoreFiles({
      fromPath: path.join(originDir, 'output', 'core'),
      toPath: `${sdkPath}/core`,
    })
  })

  logSuccess(`\nNotion Typescript clients have been generated in ${chalk.yellow(sdkPath)}`)
}

function buildOriginDir(appPath?: string) {
  if (!appPath) {
    throw new Error("Can' t locate origin directory. Make sure you run the cli with npx or pnpx")
  }

  const runDir = appPath.match(/^(.*)\/[^/]+$/)?.[1]

  if (!runDir) {
    throw new Error('Invalid origin directory?! Make sure you run the cli with npx or pnpx')
  }

  // running locally
  if (process.env.NOTION_TS_CLIENT_DEBUG) {
    return path.join(runDir, '../src')
  }

  const parts = runDir.split('/')

  if (parts[parts.length - 2] === 'notion-ts-client') {
    // pnpx
    return path.join(runDir, '../src')
  } else {
    // npx
    return path.join(runDir, '../notion-ts-client/src')
  }
}
