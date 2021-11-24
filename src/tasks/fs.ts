import { LisaType, job } from '../utils/lisa_ex';
import { join, resolve } from 'path';
import { pathExists, mkdirs, remove } from 'fs-extra';
import { loadDT } from 'zephyr-dts';

import { getEnv, getFlasher } from '../env';

import parseArgs from '../utils/parseArgs';
import extendExec from '../utils/extendExec';
import { workspace } from '../utils/ux';
import { IPartition, loadFsConfig, writeFsConfig } from '../utils/fs';
import { appendFlashConfig, getFlashArgs } from '../utils/flash';

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

export default ({ application, cmd }: LisaType) => {

  job('fs:init', {
    title: '资源结构初始化',
    before: (ctx) => [
      application.tasks['app:build'],
    ],
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

      const exec = extendExec(cmd, { task, env: await getEnv() })
      const partitions = await loadFsConfig(fsConfigPath);
      for (const part of partitions) {
        await mkdirs(join(resourceDir, part.label));
        const partFile = join(resourceBuildDir, `${part.label}.bin`);
        await exec('mklfs', ['.', partFile, `${part.size}`], {
          cwd: join(resourceDir, part.label),
        });
        appendFlashConfig(ctx, 'fs', part.addr, partFile);
      }

      await writeFsConfig(join(resourceBuildDir, 'fs.yaml'), partitions);
    },
  });

  job('fs:flash', {
    title: '资源镜像烧录',
    before: (ctx) => [
      application.tasks['fs:build'],
    ],
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        'env': { arg: 'name', help: '指定当次编译有效的环境' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp();
      }

      const exec = extendExec(cmd, { task, env: await getEnv(args['env']) });
      const flashArgs = await getFlashArgs(ctx, 'fs');
      if (Object.keys(flashArgs).length == 0) {
        return;
      }

      const flasher = await getFlasher(args['env']);
      if (flasher) {
        const { command, args: execArgs } = flasher.makeFlashExecArgs(flashArgs);
        await exec(command, execArgs);
      } else {
        throw new Error('当前环境不支持烧录资源镜像');
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
