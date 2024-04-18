import chalk from 'chalk'

export function log(message: string, ...params: unknown[]) {
  console.log(message, ...params)
}

export function logSubtle(message: string, ...params: unknown[]) {
  console.log(chalk.gray(message), ...params)
}

export function logWarn(message: string, ...params: unknown[]) {
  console.log(chalk.magenta(message), ...params)
}

export function logSuccess(message: string, ...params: unknown[]) {
  console.log(chalk.green(message), ...params)
}

export function logError(message: string, ...params: unknown[]) {
  console.error(chalk.red(message), ...params)
}
