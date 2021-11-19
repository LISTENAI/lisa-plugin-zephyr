import { readFile, pathExists } from 'fs-extra';
import { join } from 'path';

export async function getKconfig(buildDir: string, key: string): Promise<string | undefined> {
  const kconfigFile = join(buildDir, 'zephyr', '.config');
  if (!(await pathExists(kconfigFile))) return;

  const cache = await readFile(kconfigFile, { encoding: 'utf-8' });
  const leading = `${key}=`;
  for (const line of cache.split('\n')) {
    if (line.startsWith(leading)) {
      return line.substr(leading.length).trim();
    }
  }
}
