import { LisaType, job } from '../utils/lisa_ex';
// import { ParsedArgs } from 'minimist';
import { resolve, join } from 'path';
import { pathExists } from 'fs-extra';

import { getEnv } from '../env';

// import parseArgs from '../utils/parseArgs';
import extendExec from '../utils/extendExec';
// import { workspace } from '../utils/ux';
// import { getCMakeCache } from '../utils/cmake';
import { get } from '../env/config';
import { platform } from 'os';

export default ({ application, cmd }: LisaType) => {

  // 兜底直接使用west，不再提供west的job

  // job('west', {
  //   title: 'west',
  //   async task(ctx, task) {
  //     const argv = application.argv as ParsedArgs;
  //     const exec = extendExec(cmd, { task, env: await getEnv() });

  //     const westArgs = argv._.slice(1);

  //     await exec('python', ['-m', 'west', ...westArgs]);
  //   },
  //   options: {
  //     persistentOutput: true,
  //     bottomBar: Infinity,
  //   },
  // });

  // build直接使用兜底west来调用，不再需要提供menuconfig的job

  // job('menuconfig', {
  //   title: '构建选项',
  //   async task(ctx, task) {
  //     const { args, printHelp } = parseArgs(application.argv, {
  //       'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
  //       'board': { short: 'b', arg: 'name', help: '要构建的板型' },
  //       'env': { arg: 'name', help: '指定当次编译有效的环境' },
  //       'task-help': { short: 'h', help: '打印帮助' },
  //     });
  //     if (args['task-help']) {
  //       return printHelp([
  //         'menuconfig [options] [project-path]',
  //       ]);
  //     }

  //     const env = await getEnv(args['env']);
  //     if (!env['ZEPHYR_BASE']) {
  //       throw new Error(`需要设置 SDK (lisa zep use-sdk [path])`);
  //     }
  //     if (!(await pathExists(env['ZEPHYR_BASE']))) {
  //       throw new Error(`SDK 不存在: ${env['ZEPHYR_BASE']}`);
  //     }

  //     const westArgs = ['build', '--target', 'menuconfig'];

  //     const buildDir = resolve(args['build-dir'] ?? 'build');
  //     westArgs.push('--build-dir', buildDir);

  //     const board: string | undefined = args['board'] ?? await getCMakeCache(buildDir, 'CACHED_BOARD', 'STRING');
  //     if (!board) {
  //       throw new Error(`需要指定板型 (-b [board])`);
  //     }
  //     westArgs.push('--board', board);

  //     const project = workspace();
  //     if (project) {
  //       if (!(await pathExists(project))) {
  //         throw new Error(`项目不存在: ${project}`);
  //       }
  //       westArgs.push(project);
  //     }

  //     const exec = extendExec(cmd, { task, env });
  //     await exec('python', ['-m', 'west', ...westArgs], {
  //       stdio: 'inherit',
  //     });
  //   },
  // });

  job('test', {
    title: '测试',
    async task(ctx, task) {
      task.title = ''
      if (platform() === 'win32') {
        throw new Error('该命令暂不支持在 windows 下执行');
      }
      const current = await get('sdk');
      if (!current) {
        throw new Error('当前 SDK 未设置，请使用 use-sdk 命令进行设置');
      }
      const twister = join(current, 'scripts/twister');
      if (!await pathExists(twister)) {
        throw new Error('当前 SDK 中缺失 twister 测试Runner，请检查 SDK');
      }
      const argv = process.argv.slice(4);
      await cmd(twister, [...argv], {
        stdio: 'inherit',
        env: await getEnv(),
      });
    }
  })

  if (process.env.LISA_ZEP_EXEC) {
    job('exec', {
      title: 'exec',
      async task(ctx, task) {
        const exec = extendExec(cmd, { task, env: await getEnv() });

        const execArgsIndex = process.argv.indexOf('exec');
        const execArgs = process.argv.slice(execArgsIndex + 1);
        const command = execArgs.shift();
        if (!command) return;

        await exec(command, execArgs);
      },
      options: {
        persistentOutput: true,
        bottomBar: Infinity,
      },
    });
  }

  // job('export-env', {
  //   title: 'export-env',
  //   async task(ctx, task) {
  //     const env = await getEnv()
  //     console.log(env)
  //     for (let key in env) {
  //       console.log(`$env:${key}='${env[key]}'`)
  //     }
  //     console.log('\n')
  //   }
  // });


}
