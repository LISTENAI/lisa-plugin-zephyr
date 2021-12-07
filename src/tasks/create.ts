import { LisaType, job } from '../utils/lisa_ex';
import { get } from '../env/config';
import { join, parse, resolve, sep } from 'path';
import { pathExists, createReadStream, copy, mkdirs } from 'fs-extra';
import { createInterface } from 'readline';
import { once } from 'events';
import * as glob from 'glob';
import { ISampleList, path2json } from '../utils/fs';
import { promptDir } from '../utils/ux';

export default ({ application, cmd }: LisaType) => {
  job('create', {
    title: '创建sample',
    async task(ctx, task) {
      const sdk = await get('sdk') || '';
      // Feature: sample.list的位置获取方式
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
          line = !line.endsWith('*') ? join(sdk, line, './**/CMakeLists.txt') : join(sdk, `${line}*`, './CMakeLists.txt');
          sampleList.push(resolve(line));
        }
      });

      await once(rl, 'close');

      let sampleListJson: ISampleList = {};

      for (const samplePath of sampleList) {
        const files = glob.sync(samplePath, {})
        for (const file of files) {
          const dirParse = resolve(parse(file).dir).replace(sdk, '').split(sep);
          sampleListJson = await path2json(dirParse, sampleListJson);
        }
      }

      // 根据sampleListJson ux.select 嵌套
      application.debug(sampleListJson);
      const selected = await promptDir([], sampleListJson, task)
      const selectedSample = join(sdk, ...selected);
      
      const targetDir = join(process.cwd(), await task.prompt({
        type: 'Input',
        message: '创建文件夹名',
        initial: selected.pop() as string
      }));

      await mkdirs(targetDir);
      await copy(selectedSample, targetDir);
    }
  });
}
