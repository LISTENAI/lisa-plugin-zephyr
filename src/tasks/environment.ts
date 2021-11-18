import LISA from '@listenai/lisa_core';
import { ParsedArgs } from 'minimist';
import { resolve, join } from 'path';
import { mkdirs } from 'fs-extra';
import { isEqual } from 'lodash';

import { PACKAGE_HOME, loadBundles, makeEnv } from '../env';
import { zephyrVersion } from '../sdk';
import { get, set } from '../config';

import { ParseArgOptions, parseArgs, printHelp } from '../utils/parseArgs';
import withOutput from '../utils/withOutput';

export default ({ job, application, cmd }: typeof LISA) => {

  job('use-env', {
    title: '环境设置',
    async task(ctx, task) {
      const exec = withOutput(cmd, task);

      const options: ParseArgOptions = {
        'clear': { help: '清除设置' },
        'update': { help: '更新环境' },
        'task-help': { short: 'h', help: '打印帮助' },
      };

      const argv = application.argv as ParsedArgs;
      const args = parseArgs(application.argv, options);
      if (args['task-help']) {
        return printHelp(options, [
          'use-env [path] [--update]',
          'uss-env --clear',
        ]);
      }

      await mkdirs(PACKAGE_HOME);

      if (args['clear']) {
        await set('env', undefined);
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

      const options: ParseArgOptions = {
        'clear': { help: '清除设置' },
        'update': { help: '更新 SDK' },
        'task-help': { short: 'h', help: '打印帮助' },
      };

      const argv = application.argv as ParsedArgs;
      const args = parseArgs(application.argv, options);
      if (args['task-help']) {
        return printHelp(options, [
          'use-sdk [path] [--update]',
          'uss-sdk --clear',
        ]);
      }

      if (args['clear']) {
        await set('sdk', undefined);
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
          ], { env: await makeEnv() });
          await set('sdk', fullPath);
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
