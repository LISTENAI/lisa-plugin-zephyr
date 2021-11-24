import { LisaType, job } from '../utils/lisa_ex';

import { getEnv, getFlasher } from '../env';

import parseArgs from '../utils/parseArgs';
import extendExec from '../utils/extendExec';
import { getFlashArgs } from '../utils/flash';

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
        throw new Error('当前环境不支持烧录资源镜像 (可使用 lisa zep app:flash 仅烧录应用)');
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
