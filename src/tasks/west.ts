import LISA from '@listenai/lisa_core';
import { ParsedArgs } from 'minimist';

import { VENV_HOME, VENV_BIN } from '../env';

import withOutput from '../utils/withOutput';
import pathWith from '../utils/pathWith';

export default ({ job, application, cmd }: typeof LISA) => {

  job('west', {
    title: 'west',
    async task(ctx, task) {
      const argv = application.argv as ParsedArgs;
      const exec = withOutput(cmd, task);

      const westArgs = argv._.slice(1);

      await exec('west', westArgs, {
        env: {
          VIRTUAL_ENV: VENV_HOME,
          ...pathWith([VENV_BIN]),
        },
      });
    },
  });

}
