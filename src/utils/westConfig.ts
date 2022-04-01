import { parse } from 'ini';
import { get } from '../env/config';
import { join } from 'path';
import { pathExists, readFile } from 'fs-extra';

export default async function westConfig(name: string): Promise<string | null> {
  const sdk = await get('sdk');
  if (!sdk) {
    return null;
  }
  const westConfigPath = join(sdk, '..', '.west', 'config');
  if (!(await pathExists(westConfigPath))) {
    return null;
  }
  const westConfig = parse((await readFile(westConfigPath)).toString());
  return westConfig[name] || null;
}
