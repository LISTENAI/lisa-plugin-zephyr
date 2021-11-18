import { readFile, pathExists } from 'fs-extra';
import { join } from 'path';

export async function getCMakeCache(buildDir: string, key: string, type: string): Promise<string | undefined> {
  const cacheFile = join(buildDir, 'CMakeCache.txt');
  if (!(await pathExists(cacheFile))) return;

  const cache = await readFile(cacheFile, { encoding: 'utf-8' });
  const leading = `${key}:${type}=`;
  for (const line of cache.split('\n')) {
    if (line.startsWith(leading)) {
      return line.substr(leading.length).trim();
    }
  }
}
