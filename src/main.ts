import { promisify } from 'util';
import { execFile as _execFile } from 'child_process';
import { defaults } from 'lodash';
import { loadBundles, loadBinaries, getEnv } from './env';
import { PLUGIN_HOME, get } from './env/config';
import { zephyrVersion } from './utils/sdk';

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

  const sdk = await get('sdk');

  return {
    env: env && env.length > 0 ? env.join(', ') : '(未设置)',
    west: await getWestVersion() || '(未安装)',
    ...versions,
    ZEPHYR_BASE: sdk ? `${sdk} (版本: ${await zephyrVersion(sdk)})` : '(未设置)',
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
