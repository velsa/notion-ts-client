import * as changeCase from 'change-case-all'
import slugify from 'slugify'

export function normalizeProperty(property: string, caseType: 'camelCase' | 'kebabCase' = 'camelCase') {
  const propertySlug = slugify(property, {
    strict: true,
    trim: true,
  })
  const casedSlug = changeCase[caseType](propertySlug)

  if (!casedSlug?.length) {
    // throw new Error(`Could not normalize property: ${property}. Got empty string!`)
    console.error(`Could not normalize property: ${property}. Got empty string!`)
  }

  return casedSlug ?? ''
}

export function makeTypeName(varName: string) {
  const typeName = capitalizeVarName(varName)

  if (!typeName?.length) {
    // throw new Error(`Could not normalize property: ${property}. Got empty string!`)
    console.error(`Could make type name from property: ${varName}. Got empty string!`)
  }

  return typeName
}

export function makeConstVarName(varName: string) {
  const constVarName = changeCase.constantCase(varName)

  if (!constVarName?.length) {
    // throw new Error(`Could not normalize property: ${property}. Got empty string!`)
    console.error(`Could make const var name from property: ${varName}. Got empty string!`)
  }

  return constVarName
}

export function capitalizeVarName(varName: string) {
  const capVarName = varName.charAt(0).toUpperCase() + varName.slice(1)

  if (!capVarName?.length) {
    // throw new Error(`Could not normalize property: ${property}. Got empty string!`)
    console.error(`Could make capitalized var name from property: ${varName}. Got empty string!`)
  }

  return capVarName
}
