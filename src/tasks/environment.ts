import { LisaType, job } from '../utils/lisa_ex';
import { ParsedArgs } from 'minimist';
import { resolve, join } from 'path';
import { mkdirs } from 'fs-extra';
import { isEqual } from 'lodash';

import { PACKAGE_HOME, loadBundles, getEnv, invalidateEnv } from '../env';
import { get, set } from '../env/config';

import parseArgs from '../utils/parseArgs';
import withOutput from '../utils/withOutput';
import { zephyrVersion } from '../utils/sdk';

export default ({ application, cmd }: LisaType) => {

  job('use-env', {
    title: '环境设置',
    async task(ctx, task) {
      const exec = withOutput(cmd, task);
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
      task.output = `当前环境: ${env && mod.length > 0 ? env.join(', ') : '(未设置)'}`;
    },
    options: {
      persistentOutput: true,
      bottomBar: 5,
    },
  });

  job('use-sdk', {
    title: 'SDK 设置',
    async task(ctx, task) {
      const exec = withOutput(cmd, task);
      const argv = application.argv as ParsedArgs;

      const { args, printHelp } = parseArgs(application.argv, {
        'clear': { help: '清除设置' },
        'update': { help: '更新 SDK' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp([
          'use-sdk [path] [--update]',
          'uss-sdk --clear',
        ]);
      }

      if (args['clear']) {
        await set('sdk', undefined);
        await invalidateEnv();
      } else {
        const path = argv._[1];
        const current = await get('sdk');
        let target: string | undefined;
        if (path && path != current) {
          target = path;
        } else if (args['update']) {
          target = path || current;
        }
        if (target) {
          const fullPath = resolve(target);
          if (!(await zephyrVersion(fullPath))) {
            throw new Error(`该路径不是一个 Zephyr base: ${fullPath}`);
          }
          await exec('python', [
            '-m', 'pip',
            'install', '-r', join(fullPath, 'scripts', 'requirements.txt'),
          ], { env: await getEnv() });
          await set('sdk', fullPath);
          await invalidateEnv();
        }
      }

      const sdk = await get('sdk');
      const version = sdk ? await zephyrVersion(sdk) : null;
      task.output = `当前 SDK: ${sdk && version ? `Zephyr ${version} (${sdk})` : '(未设置)'}`;
    },
    options: {
      persistentOutput: true,
      bottomBar: 5,
    },
  });

}
