export interface ConfigFile {
  ignore?: string[]
  databases: ConfigFileDatabasesConfig
}
export interface ConfigFileDatabasesConfig {
  [dbId: string]: ConfigFileDatabaseConfig
}
export interface ConfigFileDatabaseConfig {
  _name: string
  varName: string
  pathName: string
  properties: ConfigFilePropertiesConfig
}

export interface ConfigFilePropertiesConfig {
  [propId: string]: ConfigFilePropertyConfig
}
export interface ConfigFilePropertyConfig {
  _name: string
  _type: string
  varName: string
  readOnly: boolean
}
