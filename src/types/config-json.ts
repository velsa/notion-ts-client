export interface ConfigFile {
  databases: ConfigFileDatabasesConfig
}
export interface ConfigFileDatabasesConfig {
  [dbId: string]: ConfigFileDatabaseConfig
}
export interface ConfigFileDatabaseConfig {
  name: string
  varName: string
  pathName: string
  properties: ConfigFilePropertiesConfig
}

export interface ConfigFilePropertiesConfig {
  [propId: string]: ConfigFilePropertyConfig
}
export interface ConfigFilePropertyConfig {
  name: string
  type: string
  varName: string
  readOnly: boolean
}
