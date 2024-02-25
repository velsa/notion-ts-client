import { makeConstVarName } from '../../parsers'
import { ConfigFilePropertiesConfig, CustomTypesPropertiesConfig } from '../../types'
import { saveContentToFile } from '../file-utils'

export function createConstantsFile(opts: {
  dbPath: string
  fileName: string
  dbVarName: string
  propsConfig: ConfigFilePropertiesConfig
  customPropsConfig: CustomTypesPropertiesConfig
}) {
  const { dbPath, fileName, dbVarName, propsConfig, customPropsConfig } = opts
  const constVarName = makeConstVarName(dbVarName)
  const propsWithValues = getPropsWithValues(customPropsConfig)
  let content = `export const ${constVarName}_PROP_VALUES = ${propsWithValues}`
  const propsToIds = getPropsToIds(propsConfig)
  const idsToProps = getIdsToProps(propsConfig)
  const propsToTypes = getPropsToTypes(propsConfig)

  content += `\nexport const ${constVarName}_PROPS_TO_IDS = ${JSON.stringify(propsToIds, null, 2)}`
  content += `\nexport const ${constVarName}_IDS_TO_PROPS = ${JSON.stringify(idsToProps, null, 2)}`
  content += `\nexport const ${constVarName}_PROPS_TO_TYPES = ${JSON.stringify(propsToTypes, null, 2)}`
  content += '\n'

  saveContentToFile(content, dbPath, fileName)
}

function getPropsWithValues(customPropsConfig: CustomTypesPropertiesConfig) {
  let content = '{'

  for (const propConfig of Object.values(customPropsConfig)) {
    const arrayContent = JSON.stringify(
      propConfig.options.map((o) => o.name),
      null,
      2,
    )

    content += `\n"${propConfig.varName}": ${arrayContent} as const,`
  }

  return content + '\n}\n'
}

function getIdsToProps(propsConfig: ConfigFilePropertiesConfig) {
  return Object.entries(propsConfig).reduce(
    (acc, [propId, propConfig]) => {
      acc[propId] = propConfig.varName

      return acc
    },
    {} as Record<string, string>,
  )
}

function getPropsToIds(propsConfig: ConfigFilePropertiesConfig) {
  return Object.entries(propsConfig).reduce(
    (acc, [propId, propConfig]) => {
      acc[propConfig.varName] = propId

      return acc
    },
    {} as Record<string, string>,
  )
}

function getPropsToTypes(propsConfig: ConfigFilePropertiesConfig) {
  return Object.values(propsConfig).reduce(
    (acc, propConfig) => {
      acc[propConfig.varName] = propConfig._type

      return acc
    },
    {} as Record<string, string>,
  )
}
