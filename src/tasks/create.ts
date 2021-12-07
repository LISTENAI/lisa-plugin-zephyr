import { LisaType, job } from '../utils/lisa_ex';
import { get } from '../env/config';
import { join } from 'path';
import { pathExists, createReadStream } from 'fs-extra';
import { createInterface } from 'readline';
import { once } from 'events';
import * as glob from 'glob';

export default ({ application, cmd }: LisaType) => {
  job('create', {
    title: '创建sample',
    async task(ctx, task) {
      const sdk = await get('sdk') || '';
      const sampleListFile = join(sdk || '', './samples/boards/csk6001/sample.list');      
      application.debug(sampleListFile);
      if (!(await pathExists(sampleListFile))) {
        throw new Error('当前sdk暂不支持create项目');
      }

      // 解析sampleListFile 按文件夹的json结构
      let sampleList: Array<string> =  [];
      const rl = createInterface({ 
        input: createReadStream(sampleListFile)
      })
      rl.on('line', async (line) => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          sampleList.push(join(sdk, line));
          // application.debug(await pathExists(join(sdk, line)));
        }
      });

      await once(rl, 'close');

      for (const samplePath of sampleList) {
        application.debug(samplePath);
        // const sampleCMakeFile = join(samplePath, './CMakeLists.txt');
        const files = glob.sync(samplePath, {})
        application.debug(files);
      }


      // for await (const line of )
      
      application.debug('end');

    
    }
  });
}
