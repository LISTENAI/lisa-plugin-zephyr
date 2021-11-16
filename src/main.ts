import { promisify } from 'util';
import { execFile as _execFile } from 'child_process';
import { PLUGIN_HOME, loadBundle, loadBinaries, makeEnv } from './env';
import { get } from './config';

const execFile = promisify(_execFile);

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
    env: env || '(未设置)',
    west: await getWestVersion() || '(未安装)',
    ...versions,
    ZEPHYR_BASE: await get('sdk') || '(未设置)',
    PLUGIN_HOME,
    ...variables,
  };
}

async function getWestVersion(): Promise<string | null> {
  try {
    const { stdout } = await execFile('python', [
      '-m', 'west', '--version',
    ], { env: await makeEnv() });
    return stdout.trim();
  } catch (e) {
    return null;
  }
}
