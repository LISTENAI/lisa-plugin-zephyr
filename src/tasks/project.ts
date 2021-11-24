import { LisaType, job } from '../utils/lisa_ex';

import { getEnv, getFlasher } from '../env';

import parseArgs from '../utils/parseArgs';
import extendExec from '../utils/extendExec';
import { getFlashArgs, toHex } from '../utils/flash';

export default ({ application, cmd }: LisaType) => {

  job('build', {
    title: '构建',
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp([
          '详见:',
          'app:build -h',
          'fs:build -h',
        ]);
      }

      return task.newListr([
        application.tasks['app:build'],
        application.tasks['fs:build'],
      ]);
    },
  });

  job('flash', {
    title: '烧录',
    before: (ctx) => [
      application.tasks['app:build'],
      application.tasks['fs:build'],
    ],
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        'env': { arg: 'name', help: '指定当次编译有效的环境' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp([
          '详见:',
          'app:flash -h',
          'fs:flash -h',
        ]);
      }

      const exec = extendExec(cmd, { task, env: await getEnv(args['env']) });
      const flashArgs = await getFlashArgs(ctx);

      const flasher = await getFlasher(args['env']);
      if (flasher) {
        const { command, args: execArgs } = flasher.makeFlashExecArgs(flashArgs);
        await exec(command, execArgs);
      } else {
        await exec('python', ['-m', 'west', 'flash']);
        const appFlashArgs = await getFlashArgs(ctx, 'app');
        const manualFlash: { addr: string, file: string }[] = [];
        for (const addr in flashArgs) {
          if (!appFlashArgs[addr]) {
            manualFlash.push({ addr: toHex(parseInt(addr)), file: flashArgs[addr] });
          }
        }
        application.debug({ manualFlash });
        if (manualFlash.length > 0) {
          process.nextTick(() => {
            console.log('');
            console.log('当前环境只支持应用烧录。你还需要手动烧录如下分区:');
            for (const { addr, file } of manualFlash) {
              console.log(`* 地址: ${addr}, 文件: ${file}`);
            }
          });
        }
      }
    },
  });

  job('clean', {
    title: '清理',
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp([
          '详见:',
          'app:clean -h',
          'fs:clean -h',
        ]);
      }

      return task.newListr([
        application.tasks['app:clean'],
        application.tasks['fs:clean'],
      ]);
    },
  });

}
