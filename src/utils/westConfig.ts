import { parse } from 'ini';
import { get } from '../env/config';
import { join } from 'path';
import { pathExists, readFile } from 'fs-extra';
import Lisa from '@listenai/lisa_core';
import { ParsedArgs } from 'minimist';

export default async function westConfig(name: string): Promise<any> {
  const sdk = await get('sdk');
  if (!sdk) {
    return null;
  }
  const westConfigPath = join(sdk, '..', '.west', 'config');
  if (!(await pathExists(westConfigPath))) {
    return null;
  }
  const westConfig = parse((await readFile(westConfigPath)).toString());
  return westConfig[name] || null;
}

export async function flashFlags(argv?: string[] | undefined): Promise<any> {
  const flashConfig = await westConfig('flash');
  const runner = (Lisa.application.argv as ParsedArgs)?.runner || flashConfig?.runner;
  argv = argv ?? process.argv.slice(3);
  if (runner) {
    const runnerFlags = Object.keys((flashConfig || {})).filter((key: string) => key.startsWith(`${runner}.`))
    argv = argv.concat(['--runner', runner]);
    runnerFlags.forEach((key: string) => {
      argv = (argv as string[]).concat([`--${key.replace(`${runner}.`, '')}`, (Lisa.application.argv as ParsedArgs)[key] ?? flashConfig[key]]);
    })
  }
  return argv;
}
