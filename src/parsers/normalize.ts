import * as changeCase from 'change-case-all'
import slugify from 'slugify'

export function normalizeProperty(property, caseType: 'camelCase' | 'kebabCase' = 'camelCase') {
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

export function normalizeTypeName(varName) {
  return capitalizeVarName(varName)
}

export function capitalizeVarName(varName) {
  return varName.charAt(0).toUpperCase() + varName.slice(1)
}
