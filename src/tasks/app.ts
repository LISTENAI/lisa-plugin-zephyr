import LISA from '@listenai/lisa_core';
import { ParsedArgs } from 'minimist';
import { join } from 'path';
import { pathExists, remove } from 'fs-extra';

import { loadBundle, makeEnv } from '../env';
import { get } from '../config';

import withOutput from '../utils/withOutput';

export default ({ job, application, cmd }: typeof LISA) => {

  job('app:build', {
    title: '应用构建',
    async task(ctx, task) {
      const argv = application.argv as ParsedArgs;
      const exec = withOutput(cmd, task);

      const project = argv._[1];
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
      }

      const env = await get('env');
      const bundle = env ? await loadBundle(env) : null;
      if (!bundle) {
        throw new Error(`需要设置环境 (lisa zep use-env [name])`);
      }

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

      await exec('python', [
        '-m', 'west',
        'build',
        '-b', board,
        '.'
      ], {
        cwd: project,
        env: await makeEnv({ bundle, sdk }),
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

      const project = argv._[1];
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
      }

      await remove(join(project, 'build'));
    },
  });

}
