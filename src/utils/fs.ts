import { DeviceTree, IDeviceTreeParser } from "./dt";

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
