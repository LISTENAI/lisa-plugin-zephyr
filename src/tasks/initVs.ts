import { LisaType, job } from '../utils/lisa_ex';
import { join, resolve } from 'path';
import {
  readFile, copy, writeFile, readJson, pathExists, writeJson
} from 'fs-extra';

import { getEnv } from '../env';
import { get } from '../env/config';
import parseArgs from '../utils/parseArgs';
import { testLog } from '../utils/testLog';

export default ({ application, cmd }: LisaType) => {

  job('init-vs', {
    title: '生成vscode debug runner',
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        'env': { arg: 'name', help: '指定编译环境' },
      });
      const current = await get('env');
      const env = await getEnv();
      let XTENSA_TOOL: string = '';
      if (!args['env']) {
        if (!current) {
          throw new Error(`需要设置 编译环境 (lisa zep use-env [path])`);
        } else if (!current.includes('csk6-dsp')) {
          throw new Error(`暂不支持其他SDK`);
        }
      } else if (args['env'] !== 'csk6-dsp') {
        throw new Error(`暂不支持其他SDK`);
      }

      const XTENSA_SYSTEM = env.XTENSA_SYSTEM;
      if (!XTENSA_SYSTEM) {
        throw new Error(`需要设置 XTENSA_SYSTEM`);
      } else {
        XTENSA_TOOL = join(XTENSA_SYSTEM.split('venus_hifi4')[0], 'XtensaTools/bin/xt-gdb.exe')
        if (!(await pathExists(XTENSA_TOOL))) {
          throw new Error(`xt-gdb不存在: ${XTENSA_TOOL}`);
        }
      }
      const jlinkSNcode = ctx.jlinkSNcode || await task.prompt({
        type: 'input',
        name: 'value',
        message: '请输入jlink 的 `SN` 码',
        initial: '.',
      })
      ctx.jlinkSNcode = jlinkSNcode;
      const targetDir = join(process.cwd(), '.vscode');
      const formDir = join(__dirname, '..', '..', 'vscode');
      await copy(formDir, targetDir);
      const configFIle = join(targetDir, 'xt-ocd-config.xml');
      const Launchfile = join(targetDir, 'launch.json');
      const configFileStr = await readFile(configFIle, 'utf8');
      const result = configFileStr.replace(/###usbser###/g, jlinkSNcode);
      await writeFile(configFIle, result, 'utf-8');
      const launchJson = await readJson(Launchfile);
      launchJson.configurations[0].linux.miDebuggerPath = XTENSA_TOOL || '';
      await writeFile(Launchfile, JSON.stringify(launchJson, null, "\t"));
      testLog(task, '成功')
    },

  });
}
