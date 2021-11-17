import LISA from '@listenai/lisa_core';
import { join } from 'path';

import withOutput from '../utils/withOutput';
import { makeEnv } from '../env';

import python from '@binary/python-3.9';
import venv from '../venv';

export default ({ job, cmd }: typeof LISA) => {

  job('install', {
    title: '环境安装',
    async task(ctx, task) {
      const exec = withOutput(cmd, task);

      await exec(join(python.binaryDir, 'python'), [
        '-m', 'venv',
        venv.homeDir,
        '--upgrade-deps',
      ]);

      await exec('python', [
        '-m', 'pip',
        'install', 'west',
      ], { env: await makeEnv() });

      await exec('west', [
        'config', '--global',
        'zephyr.base-prefer', 'env',
      ], { env: await makeEnv() });
    },
  });

}
