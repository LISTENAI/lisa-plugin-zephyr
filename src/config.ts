import { pathExists, readJson, writeJson } from 'fs-extra';
import { join } from 'path';
import { PLUGIN_HOME } from './env';

const CONFIG_FILE = join(PLUGIN_HOME, 'config.json');

interface IPluginConfig {
  env?: string;
  sdk?: string;
}

async function load<T>(): Promise<T | null> {
  if (!(await pathExists(CONFIG_FILE))) return null;
  return await readJson(CONFIG_FILE);
}

export async function get<K extends keyof IPluginConfig>(key: K): Promise<IPluginConfig[K]> {
  const config = await load<IPluginConfig>();
  return config ? config[key] : undefined;
}

export async function set<K extends keyof IPluginConfig>(key: K, val: IPluginConfig[K]): Promise<void> {
  const config = await load<IPluginConfig>() || {};
  config[key] = val;
  await writeJson(CONFIG_FILE, config);
}
