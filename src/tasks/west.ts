import LISA from '@listenai/lisa_core';
import { ParsedArgs } from 'minimist';
import { resolve } from 'path';
import { pathExists } from 'fs-extra';

import { loadBundles, makeEnv } from '../env';
import { get } from '../config';

import withOutput from '../utils/withOutput';
import { workspace } from '../utils/ux';
import { getCMakeCache } from '../utils/cmake';

export default ({ job, application, cmd }: typeof LISA) => {

  job('west', {
    title: 'west',
    async task(ctx, task) {
      const argv = application.argv as ParsedArgs;
      const exec = withOutput(cmd, task);

      const westArgs = argv._.slice(1);

      const env = await get('env');
      const bundles = await loadBundles(env);

      const sdk = await get('sdk');

      await exec('python', [
        '-m', 'west',
        ...westArgs,
      ], {
        env: await makeEnv({ bundles, sdk }),
      });
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity,
    },
  });

  job('menuconfig', {
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

      const board: string | null = argv.b ?? argv.board ?? await getCMakeCache(buildDir, 'CACHED_BOARD', 'STRING');
      if (!board) {
        throw new Error(`需要指定板型 (-b [board])`);
      }

      await exec('python', [
        '-m', 'west',
        'build',
        '--board', board,
        '--build-dir', buildDir,
        '--target', 'menuconfig',
        project,
      ], {
        env: await makeEnv({ bundles, sdk }),
        stdio: 'inherit',
      });
    },
  });

}
