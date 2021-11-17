import LISA from '@listenai/lisa_core';
import { join } from 'path';
import { readFile, pathExists, mkdirs, writeFile, remove } from 'fs-extra';
import * as YAML from 'js-yaml';
import { loadDT } from 'zephyr-dts';

import { makeEnv } from '../env';

import withOutput from '../utils/withOutput';
import { workspace } from '../utils/ux';

const FS_DEFAULT = 'LFS';

interface IPartition {
  label: string;
  addr: number;
  size: number;
  fs?: string;
}

async function loadPartitions(buildDir: string): Promise<IPartition[]> {
  const partitions: IPartition[] = []
  try {
    const dt = await loadDT(buildDir);
    const flash = dt.choose('zephyr,flash');
    if (flash) {
      for (const part of dt.under(`${flash.path}/partitions`)) {
        if (!part.label) continue;
        if (!part.reg || !part.reg[0]) continue;
        const reg = part.reg[0];
        if (typeof reg.addr != 'number' || typeof reg.size != 'number') continue;
        partitions.push({
          label: part.label,
          addr: reg.addr,
          size: reg.size,
        });
      }
    }
  } catch (e) {
  }
  return partitions;
}

async function loadFsConfig(path: string): Promise<IPartition[]> {
  try {
    return YAML.load(await readFile(path, { encoding: 'utf-8' })) as IPartition[];
  } catch (e) {
    return [];
  }
}

export default ({ job, cmd }: typeof LISA) => {

  job('fs:init', {
    title: '资源结构初始化',
    async task(ctx, task) {
      const project = workspace();
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
      }

      const partitions = await loadPartitions(join(project, 'build'));
      if (!partitions.length) {
        throw new Error(`当前项目没有声明 fixed-partitions`);
      }

      const resourceDir = join(project, 'resource');

      // 初始化目录
      await mkdirs(resourceDir);

      // 加载 FS 配置
      const fsConfigPath = join(resourceDir, 'fs.yaml');
      const fsConfig = await loadFsConfig(fsConfigPath);

      // 创建文件夹结构
      for (const part of partitions) {
        await mkdirs(join(resourceDir, part.label));
        const config = fsConfig.find(item => item.label == part.label);
        part.fs = config?.fs || FS_DEFAULT;
      }

      // 写入fs.yaml
      await writeFile(fsConfigPath, YAML.dump(partitions, {
        styles: {
          '!!int': 'hexadecimal',
        },
      }));
    }
  });

  job('fs:build', {
    title: '打包资源镜像',
    async task(ctx, task) {
      const exec = withOutput(cmd, task);

      const project = workspace();
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
      }

      const resourceDir = join(project, 'resource');
      const fsConfigPath = join(resourceDir, 'fs.yaml');
      if (!(await pathExists(fsConfigPath))) {
        throw new Error(`当前无需要打包的资源配置，可先执行 lisa zep fs:init 进行初始化`)
      }

      const buildDir = join(project, 'build', 'resource');
      await mkdirs(buildDir);

      const env = await makeEnv();
      const partitions = await loadFsConfig(fsConfigPath);
      for (const part of partitions) {
        await mkdirs(join(resourceDir, part.label));
        await exec('mklfs', ['.', join(buildDir, `${part.label}.bin`), `${part.size}`], {
          env,
          cwd: join(resourceDir, part.label),
        });
      }
    },
  });

  job('fs:flash', {
    title: '烧录资源镜像',
    async task(ctx, task) {

    },
  });

  job('fs:clean', {
    title: '清理资源镜像',
    async task(ctx, task) {
      const project = workspace();
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
      }
      await remove(join(project, 'build', 'resource'));
    },
  });

}
