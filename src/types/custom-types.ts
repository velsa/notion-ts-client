export interface CustomTypesConfig {
  [dbId: string]: CustomTypesPropertiesConfig
}

export interface CustomTypesPropertiesConfig {
  [propId: string]: CustomTypesPropertyConfig
}

export interface CustomTypesPropertyConfig {
  type: string
  name: string
  varName: string
  options: {
    name: string
    color: string
  }[]
  groups?: {
    name: string
    optionIds: string[]
  }[]
}
