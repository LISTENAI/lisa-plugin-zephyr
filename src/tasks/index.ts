import { LisaType } from '../utils/lisa_ex';

import installation from './installation';
import environment from './environment';
import project from './project';
import sdk from "./sdk";
import west from './west';
import fs from './fs';
import create from './create';
import initVs from './initVs';

export default (core: LisaType) => {
  installation(core);
  environment(core);
  project(core);
  sdk(core);
  fs(core);
  west(core);
  create(core);
  initVs(core);
}
