import { LisaType, job } from '../utils/lisa_ex';
import { ParsedArgs } from 'minimist';
import { resolve } from 'path';
import { pathExists } from 'fs-extra';

import { getEnv } from '../env';

import parseArgs from '../utils/parseArgs';
import withOutput from '../utils/withOutput';
import { workspace } from '../utils/ux';
import { getCMakeCache } from '../utils/cmake';

export default ({ application, cmd }: LisaType) => {

  job('west', {
    title: 'west',
    async task(ctx, task) {
      const argv = application.argv as ParsedArgs;
      const exec = withOutput(cmd, task);

      const westArgs = argv._.slice(1);

      await exec('python', ['-m', 'west', ...westArgs], {
        env: await getEnv(),
      });
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity,
    },
  });

  job('menuconfig', {
    title: '构建选项',
    hideTitle: true,
    async task(ctx, task) {
      const exec = withOutput(cmd, task);

      const { args, printHelp } = parseArgs(application.argv, {
        'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
        'board': { short: 'b', arg: 'name', help: '要构建的板型' },
        'env': { arg: 'name', help: '指定当次编译有效的环境' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp([
          'menuconfig [options] [project-path]',
        ]);
      }

      const env = await getEnv(args['env']);
      if (!env['ZEPHYR_BASE']) {
        throw new Error(`需要设置 SDK (lisa zep use-sdk [path])`);
      }
      if (!(await pathExists(env['ZEPHYR_BASE']))) {
        throw new Error(`SDK 不存在: ${env['ZEPHYR_BASE']}`);
      }

      const westArgs = ['build', '--target', 'menuconfig'];

      const buildDir = resolve(args['build-dir'] ?? 'build');
      westArgs.push('--build-dir', buildDir);

      const board: string | undefined = args['board'] ?? await getCMakeCache(buildDir, 'CACHED_BOARD', 'STRING');
      if (!board) {
        throw new Error(`需要指定板型 (-b [board])`);
      }
      westArgs.push('--board', board);

      const project = workspace();
      if (project) {
        if (!(await pathExists(project))) {
          throw new Error(`项目不存在: ${project}`);
        }
        westArgs.push(project);
      }

      await exec('python', ['-m', 'west', ...westArgs], {
        env,
        stdio: 'inherit',
      });
    },
  });

}
