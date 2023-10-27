import { pathExists, readJson, writeJson } from 'fs-extra';
import { join } from 'path';
import { homedir } from 'os';
export const PLUGIN_HOME = (process.env.LISA_HOME  && join( process.env.LISA_HOME,  'lisa-zephyr')) ||   join(homedir(), '.listenai', 'lisa-zephyr');
const CONFIG_FILE = join(PLUGIN_HOME, 'config.json');
interface IPluginConfig {
  env?: string[];
  sdk?: string;
}

async function load<T>(): Promise<T | null> {
  if (!(await pathExists(CONFIG_FILE))) return null;
  return await readJson(CONFIG_FILE);
}

export async function get<K extends keyof IPluginConfig>(key: K): Promise<IPluginConfig[K]> {
  const config = await load<IPluginConfig>();
  if (config && typeof config.env == 'string') {
    config.env = [config.env]; // 向后兼容
  }
  return config ? config[key] : undefined;
}

export async function set<K extends keyof IPluginConfig>(key: K, val: IPluginConfig[K]): Promise<void> {
  const config = await load<IPluginConfig>() || {};
  config[key] = val;
  await writeJson(CONFIG_FILE, config);
}
