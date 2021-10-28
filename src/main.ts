import { PLUGIN_HOME, loadBundle, loadBinaries } from './env';
import { get } from './config';

export async function env(): Promise<Record<string, string>> {
  const env = await get('env');
  const bundle = env ? await loadBundle(env) : null;

  const versions: Record<string, string> = {};
  const variables: Record<string, string> = {};

  for (const [name, binary] of Object.entries(await loadBinaries(bundle))) {
    versions[name] = await binary.version();
    Object.assign(variables, binary.env);
  }

  Object.assign(variables, bundle?.env || {});

  return {
    ...versions,
    ZEPHYR_BASE: await get('sdk') || '(未设置)',
    PLUGIN_HOME,
    ...variables,
  };
}
