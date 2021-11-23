import { LisaType, job } from '../utils/lisa_ex';
import { sortBy } from 'lodash';
import { stat } from 'fs-extra';

import { getEnv, getFlasher } from '../env';

import parseArgs from '../utils/parseArgs';
import extendExec from '../utils/extendExec';

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
    before: (ctx) => {
      if (ctx.flashConfigured) return [];
      ctx.flashConfigOnly = true;
      return [
        application.tasks['app:flash'],
        application.tasks['fs:flash'],
      ];
    },
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

      const flasher = await getFlasher(args['env']);
      if (!flasher) {
        throw new Error(`当前环境不支持烧录`);
      }

      const flashArgs: Record<number, string> = ctx.flashArgs || {};
      ctx.flashArgs = flashArgs;

      application.debug('flash configured', ctx);

      await checkFlashArgs(flashArgs);

      const { command, args: execArgs } = flasher.makeFlashExecArgs(flashArgs);
      application.debug({ command, execArgs });

      const exec = extendExec(cmd, { task, env: await getEnv(args['env']) });
      await exec(command, execArgs);
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

async function checkFlashArgs(flashArgs: Record<number, string>): Promise<void> {
  let lastAddr = 0;
  let lastTail = 0;
  for (const addr of sortBy(Object.keys(flashArgs).map(Number))) {
    if (addr < lastTail) {
      throw new Error(`分区 ${formatAddr(addr)} 与上一个分区 (${formatAddr(lastAddr)} ~ ${formatAddr(lastTail)}) 地址重叠`);
    }
    const s = await stat(flashArgs[addr]);
    lastAddr = addr;
    lastTail = addr + s.size;
  }
}

function formatAddr(addr: number): string {
  return `0x${addr.toString(16).padStart(8, '0')}`;
}
