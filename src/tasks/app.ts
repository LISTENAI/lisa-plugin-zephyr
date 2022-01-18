import { LisaType, job } from '../utils/lisa_ex';
import { resolve, join } from 'path';
import { pathExists, remove } from 'fs-extra';

import { getEnv, getFlasher } from '../env';

import parseArgs from '../utils/parseArgs';
import extendExec from '../utils/extendExec';
import { workspace } from '../utils/ux';
import { getCMakeCache } from '../utils/cmake';
import { getKconfig } from '../utils/kconfig';
import { appendFlashConfig, getFlashArgs } from '../utils/flash';

async function getAppFlashAddr(buildDir: string): Promise<number> {
  const hasLoadOffset = await getKconfig(buildDir, 'CONFIG_HAS_FLASH_LOAD_OFFSET');
  if (hasLoadOffset != 'y') return 0;
  const loadOffset = parseInt(await getKconfig(buildDir, 'CONFIG_FLASH_LOAD_OFFSET') ?? '');
  return isNaN(loadOffset) ? 0 : loadOffset;
}

export default ({ application, cmd }: LisaType) => {

  job('app:build', {
    title: '应用构建',
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
        'board': { short: 'b', arg: 'name', help: '要构建的板型' },
        'clean': { short: 'c', help: '构建前清除 (全新构建)' },
        'env': { arg: 'name', help: '指定当次编译有效的环境' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp([
          'app:build [options] [project-path]',
        ]);
      }

      const env = await getEnv(args['env']);
      if (!env['ZEPHYR_BASE']) {
        throw new Error(`需要设置 SDK (lisa zep use-sdk [path])`);
      }
      if (!(await pathExists(env['ZEPHYR_BASE']))) {
        throw new Error(`SDK 不存在: ${env['ZEPHYR_BASE']}`);
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
        await remove(buildDir);
      }

      const project = workspace();
      if (project) {
        if (!(await pathExists(project))) {
          throw new Error(`项目不存在: ${project}`);
        }
        westArgs.push(project);
      }

      const exec = extendExec(cmd, { task, env });
      await exec('python', ['-m', 'west', ...westArgs], {
        env: {
          CMAKE_EXPORT_COMPILE_COMMANDS: '1',
        },
      });

      const appAddr = await getAppFlashAddr(buildDir);
      const appFile = join(buildDir, 'zephyr', 'zephyr.bin');
      appendFlashConfig(ctx, 'app', appAddr, appFile);

      ctx.appBuilt = true;
    },
    options: {
      persistentOutput: true,
      bottomBar: 10,
    },
  });

  job('app:flash', {
    title: '应用烧录',
    before: (ctx) => [
      application.tasks['app:build'],
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
      const flashArgs = await getFlashArgs(ctx, 'app');

      const flasher = await getFlasher(args['env']);
      if (flasher) {
        const { command, args: execArgs } = flasher.makeFlashExecArgs(flashArgs);
        await exec(command, execArgs);
      } else {
        await exec('west', ['flash']);
        // await exec('python', ['-m', 'west', 'flash']);
      }
    },
  });

  job('app:clean', {
    title: '应用清理',
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp();
      }

      const buildDir = resolve(args['build-dir'] ?? 'build');
      await remove(buildDir);
    },
  });

}
