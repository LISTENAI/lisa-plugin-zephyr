import LISA from '@listenai/lisa_core';

import venv from '../venv';

import withOutput from '../utils/withOutput';
import pathWith from '../utils/pathWith';

export default ({ job, cmd }: typeof LISA) => {

  job('install', {
    title: '环境安装',
    async task(ctx, task) {
      const exec = withOutput(cmd, task);

      await exec('python3', [
        '-m', 'venv', venv.homeDir,
      ]);

      await exec('pip3', [
        'install', '-U', 'west',
      ], {
        env: {
          ...venv.env,
          ...pathWith([venv.binaryDir]),
        },
      });
    },
  });

}
