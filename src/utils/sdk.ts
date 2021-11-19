import { readFile, pathExists } from 'fs-extra';
import { join } from 'path';

export async function zephyrVersion(path: string): Promise<string | null> {
  if (!await pathExists(join(path, 'west.yml'))) {
    return null;
  }
  if (!await pathExists(join(path, 'VERSION'))) {
    return null;
  }

  const version = await parseVersion(join(path, 'VERSION'));
  return `${version.VERSION_MAJOR}.${version.VERSION_MINOR}.${version.PATCHLEVEL}`
}

async function parseVersion(path: string): Promise<Record<string, number>> {
  const version = await readFile(path, { encoding: 'utf-8' });
  const result: Record<string, number> = {};
  for (const line of version.split('\n')) {
    if (line.trim().match(/^([^=]+) = (\d+)/)) {
      result[RegExp.$1] = parseInt(RegExp.$2);
    }
  }
  return result;
}
