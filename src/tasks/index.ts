import LISA from '@listenai/lisa_core';

import installation from './installation';
import project from './project';
import app from './app';
import west from './west';
import fs from './fs';


export default (core: typeof LISA) => {
  installation(core);
  project(core);
  app(core);
  west(core);
  fs(core);
}
