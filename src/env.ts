import { Bundle } from '@lisa-env/type';
import { Binary } from '@binary/type';
import { delimiter, join } from 'path';
import pathWith from './utils/pathWith';

export const PLUGIN_HOME = join(__dirname, '..');

const CONFIG_DIR = join(PLUGIN_HOME, 'config');
const WEST_CONFIG_GLOBAL = join(CONFIG_DIR, 'westconfig');

const PIP_INDEX_URL = 'https://pypi.tuna.tsinghua.edu.cn/simple';

const BUILTIN_BINARIES = [
  '@binary/cmake',
  '@binary/dtc',
  '@binary/gperf',
  '@binary/mklfs',
  '@binary/ninja',
  '@binary/python3',
  '@binary/xz',
];

interface Module<T> {
  default: T;
}

async function loadModule<T>(name: string): Promise<T> {
  const mod = await import(name) as Module<T>;
  return mod.default;
}

export async function loadBundle(name: string): Promise<Bundle | null> {
  try {
    return await loadModule(`@lisa-env/${name}`);
  } catch (e) {
    return null;
  }
}

export async function loadBinaries(bundle?: Bundle | null): Promise<Record<string, Binary>> {
  const binaries: Record<string, Binary> = {};
  for (const name of BUILTIN_BINARIES) {
    const unprefixedName = name.split('/').slice(1).join('/');
    binaries[unprefixedName] = await loadModule<Binary>(name);
  }
  for (const name of bundle?.binaries || []) {
    binaries[name] = await loadModule<Binary>(`@binary/${name}`);
  }
  return binaries;
}

interface MakeEnvOptions {
  bundle?: Bundle | null;
  sdk?: string | null;
}

export async function makeEnv(options?: MakeEnvOptions): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  const binaries: string[] = [];
  const libraries: string[] = [];

  for (const binary of Object.values(await loadBinaries(options?.bundle))) {
    if (binary.env) {
      Object.assign(env, binary.env);
    }
    binaries.push(binary.binaryDir);
    if (binary.libraryDir) {
      libraries.push(binary.libraryDir);
    }
  }

  if (options?.sdk) {
    env['ZEPHYR_BASE'] = options.sdk;
  }

  Object.assign(env, {
    PIP_INDEX_URL,
    WEST_CONFIG_GLOBAL,
  });

  Object.assign(env, options?.bundle?.env || {});
  Object.assign(env, pathWith(binaries));

  if (libraries.length > 0 && process.platform == 'linux') {
    const { LD_LIBRARY_PATH } = process.env;
    env['LD_LIBRARY_PATH'] = [
      ...libraries,
      ...LD_LIBRARY_PATH ? LD_LIBRARY_PATH.split(delimiter) : [],
    ].join(delimiter);
  }

  return env;
}
