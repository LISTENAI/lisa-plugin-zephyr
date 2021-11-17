import LISA from '@listenai/lisa_core';
import { ParsedArgs } from 'minimist';
import { join, resolve } from 'path';
import { pathExists, remove } from 'fs-extra';
import { uniq } from 'lodash';

import { loadBundles, makeEnv } from '../env';
import { get } from '../config';

import withOutput from '../utils/withOutput';
import { workspace } from '../utils/ux';

export default ({ job, application, cmd }: typeof LISA) => {

  job('app:build', {
    title: '应用构建',
    async task(ctx, task) {
      const argv = application.argv as ParsedArgs;
      const exec = withOutput(cmd, task);

      const project = workspace();
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
      }

      const env = await get('env') || [];
      if (typeof argv.env == 'string') {
        const bundles = await loadBundles([argv.env]);
        if (bundles.length == 0) {
          throw new Error(`环境 "${argv.env}" 不存在，请先尝试执行 \`lisa zep use-env ${argv.env}\` 启用`);
        }
        env.unshift(argv.env);
      }
      const bundles = await loadBundles(uniq(env));

      const sdk = await get('sdk');
      if (!sdk) {
        throw new Error(`需要设置 SDK (lisa zep use-sdk [path])`);
      }
      if (!(await pathExists(sdk))) {
        throw new Error(`SDK 不存在: ${sdk}`);
      }

      const board: string | null = argv.b ?? argv.board;
      if (!board) {
        throw new Error(`需要指定板型 (-b [board])`);
      }

      const buildDir = resolve(argv.d ?? argv['build-dir'] ?? 'build');

      await exec('python', [
        '-m', 'west',
        'build',
        '-b', board,
        '--build-dir', buildDir,
        project,
      ], {
        env: await makeEnv({ bundles, sdk }),
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
      const argv = application.argv as ParsedArgs;
      const exec = withOutput(cmd, task);

      const project = workspace();
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
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

      const buildDir = resolve(argv.d ?? argv['build-dir'] ?? 'build');

      await exec('python', [
        '-m', 'west',
        'flash',
        '--build-dir', buildDir,
      ], {
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
      const argv = application.argv as ParsedArgs;
      const buildDir = resolve(argv.d ?? argv['build-dir'] ?? 'build');
      await remove(buildDir);
    },
  });

}
