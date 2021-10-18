import LISA from '@listenai/lisa_core';

import installation from './installation';
import west from './west';

export default (core: typeof LISA) => {
  installation(core);
  west(core);
}
