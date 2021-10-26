import LISA from '@listenai/lisa_core';

import { VENV_HOME, VENV_BIN } from '../env';

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

}
