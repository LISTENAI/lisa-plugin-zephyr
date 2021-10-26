import LISA from '@listenai/lisa_core';
import { ParsedArgs } from 'minimist';
import { resolve, join } from 'path';
import { pathExists } from 'fs-extra';

import { PLUGIN_HOME, VENV_HOME, VENV_BIN, loadEnv } from '../env';
import { get, set } from '../config';

import withOutput from '../utils/withOutput';
import pathWith from '../utils/pathWith';

export default ({ job, application, cmd }: typeof LISA) => {

  job('use-env', {
    title: '环境设置',
    async task(ctx, task) {
      const argv = application.argv as ParsedArgs;
      const exec = withOutput(cmd, task);

      const name = argv._[1];
      if (name && (name != await get('env') || argv['update'])) {
        await exec('lisa', ['install', `@tool/${name}-env`], {
          cwd: PLUGIN_HOME,
        });
        await set('env', name);
      }

      const env = await get('env');
      const mod = env ? await loadEnv(env) : null;
      task.output = `当前环境: ${env && mod ? env : '(未设置)'}`;

      if (mod) {
        if (argv['print-paths']) {
          const paths = await mod.path();
          for (const tool in paths) {
            task.output = `${tool}: ${paths[tool]}`;
          }
        } else if (argv['print-vers']) {
          const vers = await mod.version();
          for (const tool in vers) {
            task.output = `${tool}: ${vers[tool]}`;
          }
        } else if (argv['print-env']) {
          const envs = await mod.env();
          for (const key in envs) {
            task.output = `${key}=${envs[key]}`;
          }
        }
      }
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

      const path = argv._[1];
      if (path) {
        const fullPath = resolve(path);
        if (!(await pathExists(fullPath))) {
          throw new Error(`SDK 路径不存在: ${fullPath}`);
        }
        await set('sdk', path);
      }

      const sdk = await get('sdk');
      if (sdk) {
        await exec('pip3', [
          'install', '-U', '-r', join(sdk, 'scripts', 'requirements.txt'),
        ], {
          env: {
            VIRTUAL_ENV: VENV_HOME,
            ...pathWith([VENV_BIN]),
          },
        });
      }

      task.output = `SDK: ${sdk || '(未设置)'}`;
    },
    options: {
      persistentOutput: true,
      bottomBar: 5,
    },
  });

}
