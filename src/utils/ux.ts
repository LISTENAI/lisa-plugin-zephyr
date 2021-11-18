import LISA from '@listenai/lisa_core'
import { ParsedArgs } from 'minimist'
import { resolve } from 'path'

export function workspace(): string | undefined {
  const { application } = LISA;
  const argv = application.argv as ParsedArgs;
  return argv._[1] ? resolve(argv._[1]) : undefined;
}
