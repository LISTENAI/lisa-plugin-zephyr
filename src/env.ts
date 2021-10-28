import { Bundle } from '@binary/bundle';
import { Binary } from '@binary/type';
import { join } from 'path';
import pathWith from './utils/pathWith';

export const PLUGIN_HOME = join(__dirname, '..');

const BUILTIN_BINARIES = [
  './venv',
  '@binary/cmake',
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

export async function makeEnv(bundle?: Bundle | null): Promise<Record<string, string>> {
  const binaries = [...BUILTIN_BINARIES];
  for (const name of bundle?.binaries || []) {
    binaries.push(`@binary/${name}`);
  }

  const env: Record<string, string> = {};
  const paths: string[] = [];

  for (const binary of binaries) {
    const pkg = await loadModule<Binary>(binary);
    Object.assign(env, pkg.env);
    paths.push(pkg.binaryDir);
  }

  Object.assign(env, bundle?.env || {});
  Object.assign(env, pathWith(paths));

  return env;
}

export function env() {
  return {
    PLUGIN_HOME,
  }
}
