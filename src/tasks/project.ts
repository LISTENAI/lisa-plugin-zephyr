import LISA from '@listenai/lisa_core';
import { join, resolve } from 'path';
import { pathExists } from 'fs-extra';

import { loadBundles, makeEnv } from '../env';
import { get } from '../config';

import { ParseArgOptions, parseArgs, printHelp } from '../utils/parseArgs';
import withOutput from '../utils/withOutput';
import { loadFsConfig } from '../utils/fs';

export default ({ job, application, cmd }: typeof LISA) => {

  job('build', {
    title: '构建',
    async task(ctx, task) {
      return task.newListr([
        application.tasks['app:build'],
        application.tasks['fs:build'],
      ]);
    },
  });

  job('flash', {
    title: '烧录',
    async task(ctx, task) {
      const exec = withOutput(cmd, task);

      const options: ParseArgOptions = {
        'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
        'task-help': { short: 'h', help: '打印帮助' },
      };

      const args = parseArgs(application.argv, options);
      if (args['task-help']) {
        return printHelp(options, [
          'flash [options] [project-path]',
        ]);
      }

      const env = await get('env');
      const bundles = await loadBundles(env);
      if (!env || bundles.length == 0) {
        throw new Error(`未设置环境，不支持烧录 (lisa zep use-env [name])`);
      }

      const flasher = bundles[0].flasher;
      if (!flasher) {
        throw new Error(`当前环境 "${env[0]}" 不支持烧录`);
      }

      const flashArgs: Record<number, string> = ctx.flashArgs || {};
      ctx.flashArgs = flashArgs;

      if (!ctx.flashConfigured) {
        ctx.flashConfigOnly = true;
        await task.newListr([
          application.tasks['app:flash'],
          application.tasks['fs:flash'],
        ], { ctx }).run();
      }

      application.debug('flash configured', ctx);

      const { command, args: execArgs } = flasher.makeFlashExecArgs(flashArgs);
      application.debug({ command, execArgs });

      await exec(command, execArgs, {
        env: await makeEnv({ bundles }),
      });
    },
  });

  job('clean', {
    title: '清理',
    async task(ctx, task) {
      return task.newListr([
        application.tasks['app:clean'],
        application.tasks['fs:clean'],
      ]);
    },
  });

}
