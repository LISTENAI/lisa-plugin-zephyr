import LISA from '@listenai/lisa_core';

import installation from './installation';
import environment from './environment';
import project from './project';
import app from './app';
import west from './west';

export default (core: typeof LISA) => {
  installation(core);
  environment(core);
  project(core);
  app(core);
  west(core);
}
