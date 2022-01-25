import { LisaType, job } from '../utils/lisa_ex';
import { ParsedArgs } from 'minimist';
import { resolve, join } from 'path';
import { mkdirs } from 'fs-extra';
import { isEqual } from 'lodash';

import { PACKAGE_HOME, loadBundles, getEnv, invalidateEnv } from '../env';
import { get, set } from '../env/config';

import parseArgs from '../utils/parseArgs';
import extendExec from '../utils/extendExec';
import { zephyrVersion } from '../utils/sdk';
import { getRepoStatus } from '../utils/repo';

export default ({ application, cmd }: LisaType) => {

  job('use-env', {
    title: '环境设置',
    async task(ctx, task) {
      const exec = extendExec(cmd, { task });
      const argv = application.argv as ParsedArgs;

      const { args, printHelp } = parseArgs(application.argv, {
        'clear': { help: '清除设置' },
        'update': { help: '更新环境' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp([
          'use-env [path] [--update]',
          'uss-env --clear',
        ]);
      }

      await mkdirs(PACKAGE_HOME);

      if (args['clear']) {
        await set('env', undefined);
        await invalidateEnv();
      } else {
        const envs = argv._.slice(1);
        const current = await get('env') || [];
        let target: string[] = [];
        if (envs.length > 0 && !isEqual(envs, current)) {
          target = envs;
        } else if (args['update']) {
          target = envs.length > 0 ? envs : current;
        }
        if (target.length > 0) {
          await exec('lisa', [
            'install', ...target.map(name => `@lisa-env/${name}`),
            '--loglevel', 'info',
          ], {
            cwd: PACKAGE_HOME,
          });
          await set('env', target);
          await invalidateEnv();
        }
      }

      const env = await get('env');
      const mod = await loadBundles(env);
      task.title = `当前环境: ${env && mod.length > 0 ? env.join(', ') : '(未设置)'}`;
    },
    options: {
      bottomBar: 5,
    },
  });

  job('use-sdk', {
    title: 'SDK 设置',
    async task(ctx, task) {
      const exec = extendExec(cmd, { task });
      const argv = application.argv as ParsedArgs;

      const { args, printHelp } = parseArgs(application.argv, {
        'clear': { help: '清除设置' },
        'install': { help: '安装 SDK 中的组件' },
        'from-git': { arg: 'url#ref', help: '从指定仓库及分支初始化 SDK' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp([
          'use-sdk [path] [--install]',
          'use-sdk <path> --from-git https://github.com/zephyrproject-rtos/zephyr.git#main',
          'use-sdk --clear',
        ]);
      }

      if (args['clear']) {
        await set('sdk', undefined);
        await invalidateEnv();
      } else {
        const path = argv._[1];
        const current = await get('sdk');
        const target = path || current;

        let install = args['install'] || (path && path != current);

        const fromGit = args['from-git'];
        if (fromGit && fromGit.match(/(.+?)(?:#(.+))?$/)) {
          const { $1: url, $2: rev } = RegExp;
          if (!path) {
            throw new Error('未指定 SDK 路径');
          }
          const workspacePath = resolve(path);

          const env = await getEnv();
          delete env.ZEPHYR_BASE;

          const initArgs = ['init'];
          initArgs.push('--manifest-url', url);
          if (rev) initArgs.push('--manifest-rev', rev);
          initArgs.push(workspacePath);
          await exec('python', ['-m', 'west', ...initArgs], { env });

          await exec('python', ['-m', 'west', 'update'], { env, cwd: workspacePath });

          install = true;
        }

        if (target && install) {
          let zephyrPath = resolve(target);
          if (!(await zephyrVersion(zephyrPath))) {
            zephyrPath = join(zephyrPath, 'zephyr');
            if (!(await zephyrVersion(zephyrPath))) {
              throw new Error(`该路径不是一个 Zephyr base: ${zephyrPath}`);
            }
          }
          await exec('python', [
            '-m', 'pip',
            'install', '-r', join(zephyrPath, 'scripts', 'requirements.txt'),
          ], { env: await getEnv() });
          await set('sdk', zephyrPath);
          await invalidateEnv();
        }
      }

      const sdk = await get('sdk');
      const version = sdk ? await zephyrVersion(sdk) : null;
      const branch = sdk ? await getRepoStatus(sdk) : null;
      if (sdk && version) {
        if (branch) {
          task.title = `当前 SDK: Zephyr ${version} (分支 ${branch}, 位于 ${sdk})`;
        } else {
          task.title = `当前 SDK: Zephyr ${version} (位于 ${sdk})`;
        }
      } else {
        task.title = '当前 SDK: (未设置)';
      }
    },
    options: {
      bottomBar: 5,
    },
  });

}
