import { promisify } from 'util';
import { execFile as _execFile } from 'child_process';
import { defaults } from 'lodash';
import { pathExists, ensureDir, outputFile, readFile, writeFileSync } from 'fs-extra';
import { loadBundles, loadBinaries, getEnv } from './env';
import { PLUGIN_HOME, get } from './env/config';
import { zephyrVersion } from './utils/sdk';
import { getRepoStatus } from './utils/repo';
import Lisa from '@listenai/lisa_core';
import { venvScripts } from './venv';
import { ParsedArgs } from 'minimist';
import { join } from 'path'
const execFile = promisify(_execFile);

export async function env(): Promise<Record<string, string>> {
  const env = await get('env');
  const bundles = await loadBundles(env);

  const versions: Record<string, string> = {};
  const variables: Record<string, string> = {};

  for (const [name, binary] of Object.entries(await loadBinaries(bundles))) {
    try {
      versions[name] = await binary.version();
    } catch (e) {
      versions[name] = '(缺失)';
    }
    Object.assign(variables, binary.env);
  }

  if (bundles.length > 0) {
    const masterBundle = bundles[0];
    Object.assign(variables, masterBundle.env);
    for (const bundle of bundles.slice(1)) {
      defaults(variables, bundle.env);
    }
  }

  return {
    env: env && env.length > 0 ? env.join(', ') : '(未设置)',
    west: await getWestVersion() || '(未安装)',
    ...versions,
    ZEPHYR_BASE: await getZephyrInfo() || '(未设置)',
    PLUGIN_HOME,
    ...variables,
  };
}

async function getWestVersion(): Promise<string | null> {
  try {
    const { stdout } = await execFile('python', [
      '-m', 'west', '--version',
    ], { env: await getEnv() });
    return stdout.trim();
  } catch (e) {
    return null;
  }
}

async function getZephyrInfo(): Promise<string | null> {
  const sdk = await get('sdk');
  if (!sdk) return null;
  if (!(await pathExists(sdk))) return null;
  const version = await zephyrVersion(sdk);
  const branch = await getRepoStatus(sdk);
  if (branch) {
    return `${sdk} (版本: ${version}, 分支: ${branch})`;
  } else {
    return `${sdk} (版本: ${version})`
  }
}

export const exportEnv = getEnv


async function logFile(stdout: string, logPath: string, logName: string) {
  await ensureDir(logPath)
  const _logFile = join(logPath, logName)
  const time = new Date();

  try {
    if (!await pathExists(_logFile)) {
      await outputFile(_logFile, `${time}\n${stdout}\n`)
    } else {
      const data = await readFile(_logFile, 'utf8')
      await outputFile(_logFile, `${data}\n${time}\n${stdout}\n`)
    }
  } catch (err) {
    await writeFileSync(_logFile, `${time}\n${err}\n`)
  }

}
export async function undertake(argv?: string[] | undefined, log?: boolean | false): Promise<boolean> {
  argv = argv ?? process.argv.slice(3)
  const { cmd, application } = Lisa
  const buildDir = (Lisa.application.argv as ParsedArgs)?.['build-dir'] || 'build'
  const buildPath = buildDir && join(process.cwd(), buildDir)
  try {
    if (log) {
      const subprocess = await cmd(await venvScripts('west'), [...argv], {
        env: await getEnv(),
      })
      const { stdout, stderr } = await subprocess;
      stdout && await logFile(stdout, buildPath, 'build.log')
      stderr && await logFile(stderr, buildPath, 'build.log')
    } else {
      await cmd(await venvScripts('west'), [...argv], {
        stdio: 'inherit',
        env: await getEnv(),
      })
    }
  } catch (error: any) {
    log && await logFile(error, buildPath, 'build.log')
    return false
  }
  return true

}
