import { LisaType } from '../utils/lisa_ex';

import installation from './installation';
import environment from './environment';
import project from './project';
// import app from './app';
import west from './west';
import fs from './fs';
import create from './create';

export default (core: LisaType) => {
  installation(core);
  environment(core);
  project(core);
  // app(core);
  fs(core);
  west(core);
  create(core);
}
