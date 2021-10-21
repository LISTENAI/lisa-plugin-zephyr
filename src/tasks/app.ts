import LISA from '@listenai/lisa_core';
import { ParsedArgs } from 'minimist';
import { resolve, join } from 'path';
import { pathExists, remove } from 'fs-extra';

import { VENV_HOME, VENV_BIN } from '../env';

import withOutput from '../utils/withOutput';
import pathWith from '../utils/pathWith';

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

      const { ZEPHYR_BASE } = process.env;
      const zephyr: string | null = argv.z ?? argv.zephyr;
      if (!zephyr && !ZEPHYR_BASE) {
        throw new Error(`需要指定 Zephyr 目录 (-z [zephyr])`);
      }

      const board: string | null = argv.b ?? argv.board;
      if (!board) {
        throw new Error(`需要指定板型 (-b [board])`);
      }

      await exec('west', [
        'build',
        '-b', board,
        '.'
      ], {
        cwd: project,
        env: {
          ZEPHYR_BASE: zephyr ? resolve(zephyr) : ZEPHYR_BASE,
          VIRTUAL_ENV: VENV_HOME,
          ...pathWith([VENV_BIN]),
        },
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
