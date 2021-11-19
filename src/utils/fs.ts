import { readFile, writeFile } from 'fs-extra';
import * as YAML from 'js-yaml';

export interface IPartition {
  label: string;
  addr: number;
  size: number;
  fs?: string;
}

export async function loadFsConfig(path: string): Promise<IPartition[]> {
  try {
    return YAML.load(await readFile(path, { encoding: 'utf-8' })) as IPartition[];
  } catch (e) {
    return [];
  }
}

export async function writeFsConfig(path: string, partitions: IPartition[]): Promise<void> {
  await writeFile(path, YAML.dump(partitions, {
    styles: {
      '!!int': 'hexadecimal',
    },
  }));
}
