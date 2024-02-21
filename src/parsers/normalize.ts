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

export function normalizeTypeName(varName: string) {
  return capitalizeVarName(varName)
}

export function capitalizeVarName(varName: string) {
  return varName.charAt(0).toUpperCase() + varName.slice(1)
}

export function makeConstVarName(varName: string) {
  return changeCase.constantCase(varName)
}
