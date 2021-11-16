import LISA from '@listenai/lisa_core';
import { ParsedArgs } from 'minimist';
import { resolve, join } from 'path';

import { PLUGIN_HOME, loadBundle, makeEnv } from '../env';
import { zephyrVersion } from '../sdk';
import { get, set } from '../config';

import withOutput from '../utils/withOutput';

export default ({ job, application, cmd }: typeof LISA) => {

  job('use-env', {
    title: '环境设置',
    async task(ctx, task) {
      const argv = application.argv as ParsedArgs;
      const exec = withOutput(cmd, task);

      if (argv['clear']) {
        await set('env', undefined);
      } else {
        const name = argv._[1];
        const current = await get('env');
        let target: string | undefined;
        if (name && name != current) {
          target = name;
        } else if (argv['update']) {
          target = name || current;
        }
        if (target) {
          await exec('lisa', [
            'install', `@lisa-env/${target}`,
            '--no-save',
            '--package-lock', 'false',
            '--loglevel', 'info',
          ], {
            cwd: PLUGIN_HOME,
          });
          await set('env', target);
        }
      }

      const env = await get('env');
      const mod = env ? await loadBundle(env) : null;
      task.output = `当前环境: ${env && mod ? env : '(未设置)'}`;
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity,
    },
  });

  job('use-sdk', {
    title: 'SDK 设置',
    async task(ctx, task) {
      const argv = application.argv as ParsedArgs;
      const exec = withOutput(cmd, task);

      if (argv['clear']) {
        await set('sdk', undefined);
      } else {
        const path = argv._[1];
        const current = await get('sdk');
        let target: string | undefined;
        if (path && path != current) {
          target = path;
        } else if (argv['update']) {
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
