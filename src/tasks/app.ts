import LISA from '@listenai/lisa_core';
import { resolve } from 'path';
import { pathExists, remove } from 'fs-extra';
import { uniq } from 'lodash';

import { loadBundles, makeEnv } from '../env';
import { get } from '../config';

import { ParseArgOptions, parseArgs, printHelp } from '../utils/parseArgs';
import withOutput from '../utils/withOutput';
import { workspace } from '../utils/ux';
import { getCMakeCache } from '../utils/cmake';

export default ({ job, application, cmd }: typeof LISA) => {

  job('app:build', {
    title: '应用构建',
    async task(ctx, task) {
      const exec = withOutput(cmd, task);

      const options: ParseArgOptions = {
        'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
        'board': { short: 'b', arg: 'name', help: '要构建的板型' },
        'clean': { short: 'c', help: '构建前清除 (全新构建)' },
        'env': { arg: 'name', help: '指定当次编译有效的环境' },
        'task-help': { short: 'h', help: '打印帮助' },
      };

      const args = parseArgs(application.argv, options);
      if (args['task-help']) {
        return printHelp(options, [
          'app:build [options] [project-path]',
        ]);
      }

      const env = await get('env') || [];
      if (typeof args.env == 'string') {
        const bundles = await loadBundles([args.env]);
        if (bundles.length == 0) {
          throw new Error(`环境 "${args.env}" 不存在，请先尝试执行 \`lisa zep use-env ${args.env}\` 启用`);
        }
        env.unshift(args.env);
      }
      const bundles = await loadBundles(uniq(env));

      const sdk = await get('sdk');
      if (!sdk) {
        throw new Error(`需要设置 SDK (lisa zep use-sdk [path])`);
      }
      if (!(await pathExists(sdk))) {
        throw new Error(`SDK 不存在: ${sdk}`);
      }

      const westArgs = ['build'];

      const buildDir = resolve(args['build-dir'] ?? 'build');
      westArgs.push('--build-dir', buildDir);

      const board: string | undefined = args['board'] ?? await getCMakeCache(buildDir, 'CACHED_BOARD', 'STRING');
      if (!board) {
        throw new Error(`需要指定板型 (-b [board])`);
      }
      westArgs.push('--board', board);

      if (args['clean']) {
        westArgs.push('--pristine', 'always');
      }

      const project = workspace();
      if (project) {
        if (!(await pathExists(project))) {
          throw new Error(`项目不存在: ${project}`);
        }
        westArgs.push(project);
      }

      await exec('python', ['-m', 'west', ...westArgs], {
        env: {
          ...await makeEnv({ bundles, sdk }),
          CMAKE_EXPORT_COMPILE_COMMANDS: '1',
        },
      });
    },
    options: {
      persistentOutput: true,
      bottomBar: 10,
    },
  });

  job('app:flash', {
    title: '应用烧录',
    async task(ctx, task) {
      const exec = withOutput(cmd, task);

      const options: ParseArgOptions = {
        'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
        'task-help': { short: 'h', help: '打印帮助' },
      };

      const args = parseArgs(application.argv, options);
      if (args['task-help']) {
        return printHelp(options);
      }

      const env = await get('env');
      const bundles = await loadBundles(env);

      const sdk = await get('sdk');
      if (!sdk) {
        throw new Error(`需要设置 SDK (lisa zep use-sdk [path])`);
      }
      if (!(await pathExists(sdk))) {
        throw new Error(`SDK 不存在: ${sdk}`);
      }

      const westArgs = ['flash'];

      const buildDir = resolve(args['build-dir'] ?? 'build');
      westArgs.push('--build-dir', buildDir);

      await exec('python', ['-m', 'west', ...westArgs], {
        env: await makeEnv({ bundles, sdk }),
      });
    },
    options: {
      persistentOutput: true,
      bottomBar: 10,
    },
  });

  job('app:clean', {
    title: '应用清理',
    async task(ctx, task) {
      const options: ParseArgOptions = {
        'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
        'task-help': { short: 'h', help: '打印帮助' },
      };

      const args = parseArgs(application.argv, options);
      if (args['task-help']) {
        return printHelp(options);
      }

      const buildDir = resolve(args['build-dir'] ?? 'build');
      await remove(buildDir);
    },
  });

}
