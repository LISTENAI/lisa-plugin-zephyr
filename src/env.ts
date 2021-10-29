import { Bundle } from '@binary/bundle';
import { Binary } from '@binary/type';
import { join } from 'path';
import pathWith from './utils/pathWith';

export const PLUGIN_HOME = join(__dirname, '..');

const WEST_CONFIG_GLOBAL = join(PLUGIN_HOME, 'westconfig');

const BUILTIN_BINARIES = [
  '@binary/cmake',
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
    return await loadModule(`@tool/${name}-env`);
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
  const paths: string[] = [];

  for (const binary of Object.values(await loadBinaries(options?.bundle))) {
    Object.assign(env, binary.env);
    paths.push(binary.binaryDir);
  }

  if (options?.sdk) {
    env['ZEPHYR_BASE'] = options.sdk;
  }

  env['WEST_CONFIG_GLOBAL'] = WEST_CONFIG_GLOBAL;

  Object.assign(env, options?.bundle?.env || {});
  Object.assign(env, pathWith(paths));

  return env;
}
