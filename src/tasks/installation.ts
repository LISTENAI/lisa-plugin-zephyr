import LISA from '@listenai/lisa_core';
import { join } from 'path';
import { mkdirs, remove } from 'fs-extra';

import withOutput from '../utils/withOutput';
import { getEnv, invalidateEnv } from '../env';
import { PLUGIN_HOME } from '../env/config';

import python from '@binary/python-3.9';
import venv from '../venv';

export default ({ job, cmd }: typeof LISA) => {

  job('install', {
    title: '环境安装',
    async task(ctx, task) {
      const exec = withOutput(cmd, task);

      await mkdirs(PLUGIN_HOME);

      await exec(join(python.binaryDir, 'python'), [
        '-m', 'venv',
        venv.homeDir,
        '--upgrade-deps',
      ]);

      await exec('python', [
        '-m', 'pip',
        'install', 'west',
      ], { env: await getEnv() });

      await exec('west', [
        'config', '--global',
        'zephyr.base-prefer', 'env',
      ], { env: await getEnv() });

      await invalidateEnv();
    },
  });

  job('uninstall', {
    title: '环境卸载',
    async task(ctx, task) {
      await remove(PLUGIN_HOME);
    },
  });

}
