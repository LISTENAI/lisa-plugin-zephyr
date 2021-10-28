import LISA from '@listenai/lisa_core';
import { ParsedArgs } from 'minimist';

import { loadBundle, makeEnv } from '../env';
import { get } from '../config';

import withOutput from '../utils/withOutput';

export default ({ job, application, cmd }: typeof LISA) => {

  job('west', {
    title: 'west',
    async task(ctx, task) {
      const argv = application.argv as ParsedArgs;
      const exec = withOutput(cmd, task);

      const westArgs = argv._.slice(1);

      const env = await get('env');
      const bundle = env ? await loadBundle(env) : null;

      const sdk = await get('sdk');
      const sdkEnv = sdk ? { ZEPHYR_BASE: sdk } : {};

      await exec('west', westArgs, {
        env: {
          ...sdkEnv,
          ...await makeEnv(bundle),
        },
      });
    },
    options: {
      persistentOutput: true,
      bottomBar: Infinity,
    },
  });

}
