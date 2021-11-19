import LISA from '@listenai/lisa_core';
import { join, resolve } from 'path';
import { pathExists, mkdirs, remove } from 'fs-extra';
import { loadDT } from 'zephyr-dts';

import { getEnv } from '../env';

import parseArgs from '../utils/parseArgs';
import withOutput from '../utils/withOutput';
import { workspace } from '../utils/ux';
import { IPartition, loadFsConfig, writeFsConfig } from '../utils/fs';

const FS_DEFAULT = 'LFS';

async function loadPartitions(buildDir: string): Promise<IPartition[]> {
  const partitions: IPartition[] = [];
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

export default ({ job, application, cmd }: typeof LISA) => {

  job('fs:init', {
    title: '资源结构初始化',
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp([
          'fs:init [options] [project-path]',
        ]);
      }

      const project = workspace() ?? process.cwd();
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
      }

      const buildDir = resolve(args['build-dir'] ?? 'build');
      if (!(await pathExists(buildDir))) {
        await task.newListr(application.tasks['app:build']).run();
      }

      const partitions = await loadPartitions(buildDir);
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

      // 写入 FS 配置
      await writeFsConfig(fsConfigPath, partitions);
    }
  });

  job('fs:build', {
    title: '资源镜像构建',
    async task(ctx, task) {
      const exec = withOutput(cmd, task);

      const { args, printHelp } = parseArgs(application.argv, {
        'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp([
          'fs:build [options] [project-path]',
        ]);
      }

      const project = workspace() ?? process.cwd();
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
      }

      const resourceDir = join(project, 'resource');
      const fsConfigPath = join(resourceDir, 'fs.yaml');
      if (!(await pathExists(fsConfigPath))) {
        return;
      }

      const buildDir = resolve(args['build-dir'] ?? 'build');
      const resourceBuildDir = join(buildDir, 'resource');

      await mkdirs(resourceBuildDir);

      const env = await getEnv();
      const partitions = await loadFsConfig(fsConfigPath);
      for (const part of partitions) {
        await mkdirs(join(resourceDir, part.label));
        await exec('mklfs', ['.', join(resourceBuildDir, `${part.label}.bin`), `${part.size}`], {
          env,
          cwd: join(resourceDir, part.label),
        });
      }

      await writeFsConfig(join(resourceBuildDir, 'fs.yaml'), partitions);
    },
  });

  job('fs:flash', {
    title: '资源镜像烧录',
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp([
          'fs:flash [options] [project-path]',
        ]);
      }

      await task.newListr(application.tasks['fs:build']).run();

      const flashArgs: Record<number, string> = ctx.flashArgs || {};
      ctx.flashArgs = flashArgs;

      const buildDir = resolve(args['build-dir'] ?? 'build');
      const resourceBuildDir = join(buildDir, 'resource');

      const fsConfigPath = join(resourceBuildDir, 'fs.yaml');
      if (!(await pathExists(fsConfigPath))) {
        return;
      }

      const partitions = await loadFsConfig(fsConfigPath);
      for (const part of partitions) {
        const partFile = join(resourceBuildDir, `${part.label}.bin`);
        if (await pathExists(partFile)) {
          flashArgs[part.addr] = partFile;
        }
      }

      application.debug('fs:flash configured', ctx);

      if (!ctx.flashConfigOnly) {
        ctx.flashConfigured = true;
        return task.newListr(application.tasks['flash'], { ctx });
      }
    },
  });

  job('fs:clean', {
    title: '资源镜像清理',
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp();
      }

      const buildDir = resolve(args['build-dir'] ?? 'build');
      await remove(join(buildDir, 'resource'));
    },
  });

}
