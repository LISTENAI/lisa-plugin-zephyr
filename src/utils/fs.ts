import { DeviceTree, IDeviceTreeParser } from './dt';
import { join } from 'path';
import { pathExists } from 'fs-extra';

export interface IPartition {
  label: string;
  addr: number;
  size: number;
  type: 'littlefs';
}

export function parsePartitions(dt: DeviceTree & IDeviceTreeParser): IPartition[] {
  const partitions: IPartition[] = [];
  for (const node of Object.values(dt.nodes)) {
    if (node.compatible?.includes('zephyr,fstab,littlefs')) {
      const path = node.properties.partition;
      if (typeof path != 'string') continue;

      const part = dt.node(path);
      if (!part?.label) continue;
      if (!part?.reg || !part?.reg[0]) continue;

      const reg = part.reg[0];
      if (typeof reg.addr != 'number' || typeof reg.size != 'number') continue;
      partitions.push({
        label: part.label,
        addr: reg.addr,
        size: reg.size,
        type: 'littlefs',
      });
    }
  }
  return partitions;
}

export interface IFsFilter {
  [key: string]: string | IFsFilter;
}

export async function checkFsFilter(label: string, fsFilter: IFsFilter, prePath: string): Promise<void> {
  const filter = fsFilter[label];
  if (!filter) return;

  if (typeof filter === 'string') {
    if (!(await pathExists(join(prePath, filter)))) {
      throw new Error(`文件系统检测缺失${label}资源：${join(prePath, filter)}`);
    }
  } else {
    for (const part of Object.keys(filter)) {
      await checkFsFilter(part, filter, join(prePath, label));
    }
  }
}
