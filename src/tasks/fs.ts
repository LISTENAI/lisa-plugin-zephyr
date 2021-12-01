import { LisaType, job } from '../utils/lisa_ex';
import { join, resolve } from 'path';
import { pathExists, mkdirs, remove } from 'fs-extra';

import { getEnv, getFlasher } from '../env';

import parseArgs from '../utils/parseArgs';
import extendExec from '../utils/extendExec';
import { workspace } from '../utils/ux';
import { loadDT } from '../utils/dt';
import { parsePartitions } from '../utils/fs';
import { appendFlashConfig, getFlashArgs } from '../utils/flash';

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

      const dt = await loadDT(buildDir, await getEnv());
      const partitions = parsePartitions(dt);
      application.debug({ partitions });
      if (!partitions.length) {
        throw new Error(`当前项目没有声明 fixed-partitions`);
      }

      const resourceDir = join(project, 'resource');

      // 初始化目录
      await mkdirs(resourceDir);

      // 创建文件夹结构
      for (const part of partitions) {
        await mkdirs(join(resourceDir, part.label));
      }
    }
  });

  job('fs:build', {
    title: '资源镜像构建',
    before: (ctx) => ctx.appBuilt ? [] : [
      application.tasks['app:build'],
    ],
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

      const buildDir = resolve(args['build-dir'] ?? 'build');

      const dt = await loadDT(buildDir, await getEnv());
      const partitions = parsePartitions(dt);
      application.debug({ partitions });
      if (!partitions.length) {
        return;
      }

      const resourceDir = join(project, 'resource');
      const resourceBuildDir = join(buildDir, 'resource');
      await mkdirs(resourceBuildDir);

      const exec = extendExec(cmd, { task, env: await getEnv() });

      for (const part of partitions) {
        if (part.type == 'littlefs') {
          await mkdirs(join(resourceDir, part.label));
          const partFile = join(resourceBuildDir, `${part.label}.bin`);
          await exec('mklfs', ['.', partFile, `${part.size}`], {
            cwd: join(resourceDir, part.label),
          });
          appendFlashConfig(ctx, 'fs', part.addr, partFile);
        }
      }
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
