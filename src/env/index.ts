import LISA from '@listenai/lisa_core';
import { Bundle, Flasher } from '@lisa-env/type';
import { Binary } from '@binary/type';
import { delimiter, join } from 'path';
import { uniq, defaults } from 'lodash';
import { pathExists, readJson, outputJson, remove } from 'fs-extra';

import { KEY_OF_PATH, SYSTEM_PATHS, makePath, splitPath } from '../utils/path';
import typedImport from '../utils/typedImport';

import { PLUGIN_HOME, get } from './config';

export const PACKAGE_HOME = join(PLUGIN_HOME, 'packages');
const PACKAGE_MODULES_DIR = join(PACKAGE_HOME, 'node_modules');

const CONFIG_DIR = join(PLUGIN_HOME, 'config');
const WEST_CONFIG_GLOBAL = join(CONFIG_DIR, 'westconfig');

const ENV_CACHE_DIR = join(PLUGIN_HOME, 'envs');

const PIP_INDEX_URL = process.env.PIP_INDEX_URL || 'https://pypi.tuna.tsinghua.edu.cn/simple';

const CMAKE_EXPORT_COMPILE_COMMANDS = process.env.CMAKE_EXPORT_COMPILE_COMMANDS || 1;

const BUILTIN_BINARIES = [
  '../venv',
  '@binary/cmake',
  '@binary/dtc',
  '@binary/gperf',
  '@binary/mklfs',
  '@binary/ninja',
  '@binary/protoc',
  '@binary/xz',
];

export async function getEnv(override?: string): Promise<Record<string, string>> {
  const escape = (name: string) => name.replaceAll('/', '_').replaceAll('\\', '_');
  const cacheName = override ? `cache_${escape(override)}.json` : 'cache.json';
  const cacheFile = join(ENV_CACHE_DIR, cacheName);
  if (await pathExists(cacheFile)) {
    const env = await readJson(cacheFile);
    Object.assign(env, makePath([...splitPath(env[KEY_OF_PATH]), ...SYSTEM_PATHS]));
    return env;
  } else {
    const env = await makeEnv(override);
    await outputJson(cacheFile, env);
    Object.assign(env, makePath([...splitPath(env[KEY_OF_PATH]), ...SYSTEM_PATHS]));
    return env;
  }
}

export async function invalidateEnv(): Promise<void> {
  await remove(ENV_CACHE_DIR);
}

export async function getFlasher(override?: string): Promise<Flasher | undefined> {
  const envs = await get('env') || [];
  if (override) envs.unshift(override);
  const bundles = await loadBundles(uniq(envs));
  if (bundles.length == 0) return undefined;
  return bundles[0].flasher;
}

export async function loadBundles(envs?: string[]): Promise<Bundle[]> {
  if (!envs) return [];
  try {
    return await Promise.all(envs.map(name => typedImport<Bundle>(`${PACKAGE_MODULES_DIR}/@lisa-env/${name}`)));
  } catch (e) {
    return [];
  }
}

export async function loadBinaries(bundles?: Bundle[]): Promise<Record<string, Binary>> {
  const binaries: Record<string, Binary> = {};
  for (const name of BUILTIN_BINARIES) {
    const unprefixedName = name.split('/').slice(1).join('/');
    binaries[unprefixedName] = await typedImport<Binary>(name);
  }
  for (const bundle of bundles || []) {
    for (const name of bundle.binaries || []) {
      binaries[name] = await typedImport<Binary>(`${PACKAGE_MODULES_DIR}/@binary/${name}`);
    }
  }
  return binaries;
}

async function makeEnv(override?: string): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  const binaries: string[] = [];
  const libraries: string[] = [];

  const envs = await get('env') || [];
  if (override) envs.unshift(override);
  const bundles = await loadBundles(uniq(envs));

  for (const binary of Object.values(await loadBinaries(bundles))) {
    if (binary.env) {
      Object.assign(env, binary.env);
    }
    binaries.push(binary.binaryDir);
    if (binary.libraryDir) {
      libraries.push(binary.libraryDir);
    }
  }

  const sdk = await get('sdk');
  if (sdk) {
    env['ZEPHYR_BASE'] = sdk;
  }

  Object.assign(env, {
    PIP_INDEX_URL,
    WEST_CONFIG_GLOBAL,
    CMAKE_EXPORT_COMPILE_COMMANDS,
  });

  if (bundles.length > 0) {
    const masterBundle = bundles[0];
    Object.assign(env, masterBundle.env);
    for (const bundle of bundles.slice(1)) {
      defaults(env, bundle.env);
    }
  }

  Object.assign(env, makePath(binaries));

  if (libraries.length > 0 && process.platform == 'linux') {
    const { LD_LIBRARY_PATH } = process.env;
    env['LD_LIBRARY_PATH'] = [
      ...libraries,
      ...LD_LIBRARY_PATH ? LD_LIBRARY_PATH.split(delimiter) : [],
    ].join(delimiter);
  }

  if (process.platform == 'linux') {
    try {
      const dirs: string[] = [];
      const { stdout } = await LISA.cmd('infocmp', ['-D'], { shell: true });
      LISA.application.debug('infocmp -D', stdout);
      for (const dir of stdout.split('\n')) {
        if (dir && await pathExists(dir)) {
          dirs.push(dir);
        }
      }
      env['TERMINFO_DIRS'] = dirs.join(delimiter);
      LISA.application.debug('TERMINFO_DIRS', env['TERMINFO_DIRS']);
    } catch (e) {
    }
  }

  return env;
}

export async function getBinarie(name: string): Promise<any> {
  const envs = (await get("env")) || [];
  const bundles = await loadBundles(uniq(envs));
  const binaries = await loadBinaries(bundles);
  for (const binary of Object.keys(binaries)) {
    if (name === binary.toString()) {
      return binaries[binary];
    }
  }
}
