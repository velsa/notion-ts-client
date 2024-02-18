import chalk from 'chalk'

export function log(...message: string[]) {
  console.log(...message)
}

export function logWarn(message: string) {
  console.log(chalk.magenta(message))
}

export function logSuccess(message: string) {
  console.log(chalk.green(message))
}

export function logError(message: string) {
  console.error(chalk.red(message))
}
