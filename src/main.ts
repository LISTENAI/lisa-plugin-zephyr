import { promisify } from 'util';
import { execFile as _execFile } from 'child_process';
import { defaults } from 'lodash';
import { pathExists } from 'fs-extra';
import { loadBundles, loadBinaries, getEnv } from './env';
import { PLUGIN_HOME, get } from './env/config';
import { sdkTag } from './utils/sdk';
import { getCommit, getBranch, clean } from './utils/repo';
import Lisa from '@listenai/lisa_core';
import { venvScripts } from './venv';
import simpleGit from 'simple-git';
import execa from 'execa';
import { workspace } from './utils/ux';
import AppProject from './utils/appProject';
import { resolve, dirname } from 'path';
import * as Sentry from "@sentry/node";
Sentry.init({
  dsn: "http://e1729ec787e54957b0252fff58844c80@sentry.iflyos.cn/106",
  tracesSampleRate: 1.0,
});
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
  const tag = await sdkTag(sdk);
  const git = simpleGit(sdk);
  const commit = await getCommit(git);
  const branch = await getBranch(git);
  const isClean = await clean(git);

  const commitMsg = `commit: ${commit}${isClean ? '' : '*'}`

  if (tag && !branch) {
    return `${sdk} (版本: ${tag}, ${commitMsg})`;
  }
  if (branch) {
    return `${sdk} (分支: ${branch}, ${commitMsg})`;
  } else {
    return `${sdk} (${commitMsg})`;
  }
}

export const exportEnv = getEnv

export async function undertake(argv?: string[] | undefined, options?: execa.Options<string> | undefined): Promise<boolean> {
  argv = argv ?? process.argv.slice(3)
  const { cmd } = Lisa

  const cwd = options?.cwd ?? workspace() ?? process.cwd();
  const app = new AppProject(cwd);
  const topdir = (await app.topdir()) || '';
  const selfSDK = (await app.selfSDK()) || '';

  const env = await getEnv();
  if (env['ZEPHYR_BASE'] && resolve(topdir) !== resolve(dirname(env['ZEPHYR_BASE']))) {
    delete env['ZEPHYR_BASE'];
  }

  if (selfSDK) {
    env['ZEPHYR_BASE'] = selfSDK;
  }

  try {
    const res = await cmd(await venvScripts('west'), [...argv], Object.assign({
      stdio: 'inherit',
      env
    }, options));
    Lisa.application.debug(res);
  } catch (error: any) {
   await Sentry.captureException(error);
    await Sentry.flush(2000);
    process.exit(error.exitCode); 
  }
  return true

}
