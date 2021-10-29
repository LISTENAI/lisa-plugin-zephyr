import { Bundle } from '@binary/bundle';
import { Binary } from '@binary/type';
import { join } from 'path';
import pathWith from './utils/pathWith';

export const PLUGIN_HOME = join(__dirname, '..');

const BUILTIN_BINARIES = [
  './venv',
  '@binary/cmake',
  '@binary/ninja',
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

export async function makeEnv(bundle?: Bundle | null): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  const paths: string[] = [];

  for (const binary of Object.values(await loadBinaries(bundle))) {
    Object.assign(env, binary.env);
    paths.push(binary.binaryDir);
  }

  Object.assign(env, bundle?.env || {});
  Object.assign(env, pathWith(paths));

  return env;
}
