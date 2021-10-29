import LISA from '@listenai/lisa_core';

import withOutput from '../utils/withOutput';
import pathWith from '../utils/pathWith';
import { makeEnv } from '../env';

export default ({ job, cmd }: typeof LISA) => {

  job('install', {
    title: '环境安装',
    async task(ctx, task) {
      const exec = withOutput(cmd, task);
      const env = await makeEnv();

      await exec('python', [
        '-m', 'pip',
        'install', '--upgrade', 'pip',
      ], { env });

      await exec('python', [
        '-m', 'pip',
        'install', 'west',
      ], { env });

      await exec('west', [
        'config', '--global',
        'zephyr.base-prefer', 'env',
      ], { env });
    },
  });

}
