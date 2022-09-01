import { LisaType, job } from '../utils/lisa_ex';
import parseArgs from "../utils/parseArgs";
import BuildDir from '../models/buildDir';
import { join } from 'path';
import { getBinarie } from '../env'

import { writeFile } from 'fs-extra';
import { platform, tmpdir } from 'os';

const RUNNER_KEY = 'flash-runner';



export default ({ application, cmd }: LisaType) => {
  job('erase', {
    title: '擦除flash',
    async task(ctx, task) {
      task.title = '';
      const { args, printHelp } = parseArgs(application.argv, {
        // "task-help": { short: "h", help: "打印帮助" },
        "runner": { short: "r", arg: "runner", help: "烧录器" },
        "build-dir": { short: "d", arg: "buildDir", help: "编译产物路径" },
        "speed": { arg: "speed", help: "速度" },
        "device": { arg: "device", help: "设备" },
        "start": { arg: "start", help: "起始地址" },
        "end": { arg: "end", help: "结束地址" },
        "size": { arg: "size", help: "扇区大小" },
      });

      const buildDir = new BuildDir(args['build-dir'] || '')
      
      const runner: string = args['runner'] || (await buildDir.runnerYml())[RUNNER_KEY];
      if (!runner) {
        throw new Error('没有可使用的runner烧录器，请带上`--runner`参数')
      }

      const RUNNERS: {[key: string]: string} = {
        'jlink': join((await getBinarie('jlink-venus'))?.binaryDir || '', platform() === 'win32' ? 'JLink.exe' : 'JLinkExe'),
        // 'pyocd': await venvScripts('pyocd')
      }

      const commander = RUNNERS[runner]
      if (!commander) {
        throw new Error('当前不支持该 runner 烧录器')
      }

      const CommanderScript = []
      CommanderScript.push('r')
      if (!args['start']) {
        CommanderScript.push('Erase sector')
      } else {
        const saddr = args['start'],
              eaddr = args['end'],
              size = args['size'];
        if (eaddr) {
          if (isNaN(parseInt(saddr))) {
            throw new Error('起始地址不能为空')
          }
          if (isNaN(parseInt(eaddr))) {
            throw new Error('起始地址不能为空')
          }
          if (parseInt(saddr) > parseInt(eaddr)) {
            throw new Error('起始地址不能超过结束地址')
          }
          CommanderScript.push(`Erase 0x${parseInt(saddr).toString(16)} 0x${parseInt(eaddr).toString(16)}`)
        } else {
          if (!size || isNaN(parseInt(size))) {
            throw new Error('请输入要擦除扇区的结束地址或要擦除扇区的大小')
          }
          if (isNaN(parseInt(saddr))) {
            throw new Error('起始地址不能为空')
          }
          CommanderScript.push(`Erase 0x${parseInt(saddr).toString(16)} 0x${(parseInt(saddr) + parseInt(size)).toString(16)}`)
        }
      }
      CommanderScript.push('q')

      const tmpfile = join(tmpdir(), 'runner.jlink')
      await writeFile(join(tmpdir(), 'runner.jlink'), CommanderScript.join('\n'))

      console.log(commander);
      const commandArgs = [];
      commandArgs.push('-nogui', '1');
      commandArgs.push('-if', 'swd');
      commandArgs.push('-speed', args['speed'] ?? 'auto');
      commandArgs.push('-device', args['device'] ?? 'Venus_32MB');
      commandArgs.push('-CommanderScript', tmpfile);
      commandArgs.push('-nogui', '1');
      console.log(commandArgs)

      await cmd(commander, commandArgs, {
        stdio: "inherit",
      })

      task.title = '结束';
    },

  });
}