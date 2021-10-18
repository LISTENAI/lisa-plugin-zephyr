import LISA from '@listenai/lisa_core';
import { remove } from 'fs-extra';

import { PLUGIN_HOME, VENV_HOME, VENV_BIN } from '../env';

import withOutput from '../utils/withOutput';
import pathWith from '../utils/pathWith';

export default ({ job, cmd }: typeof LISA) => {

  job('install', {
    title: '环境安装',
    async task(ctx, task) {
      const exec = withOutput(cmd, task);

      await exec('python3', [
        '-m', 'venv', VENV_HOME,
      ]);

      await exec('pip3', [
        'install', '-U', 'west',
      ], {
        env: {
          VIRTUAL_ENV: VENV_HOME,
          ...pathWith([VENV_BIN]),
        },
      });
    },
  });

  job('uninstall', {
    title: '环境卸载',
    async task(ctx, task) {
      await remove(PLUGIN_HOME);
    },
  });

}
