import { LisaType, job } from '../utils/lisa_ex';
import { ParsedArgs } from 'minimist';
import { resolve, join } from 'path';
import { mkdirs, pathExists, readFile } from 'fs-extra';
import { isEqual } from 'lodash';
import Lisa from '@listenai/lisa_core';

import { PACKAGE_HOME, loadBundles, getEnv, invalidateEnv } from '../env';
import { get, set } from '../env/config';

import parseArgs from '../utils/parseArgs';
import extendExec from '../utils/extendExec';
import { zephyrVersion } from '../utils/sdk';
import { getRepoStatus } from '../utils/repo';

async function checkZephyrBase(ZEPHYR_BASE: string, westConfigPath: string) {
  if (!ZEPHYR_BASE) {
    throw new Error(`需要设置 SDK (lisa zep use-sdk [path])`);
  }
  if (!(await pathExists(westConfigPath))) {
    throw new Error(`当前 SDK 未初始化，需要设置 SDK (lisa zep use-sdk [directory] [--from-git URL#TAG] [--manifest PATH])`);
  }
}
export default ({ application, cmd }: LisaType) => {

  job('use-env', {
    title: '环境设置',
    async task(ctx, task) {
      const exec = extendExec(cmd, { task });
      const argv = application.argv as ParsedArgs;

      const { args, printHelp } = parseArgs(application.argv, {
        'clear': { help: '清除设置' },
        'update': { help: '更新环境' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        return printHelp([
          'use-env [path] [--update]',
          'uss-env --clear',
        ]);
      }

      await mkdirs(PACKAGE_HOME);

      if (args['clear']) {
        await set('env', undefined);
        await invalidateEnv();
      } else {
        const envs = argv._.slice(1);
        const current = await get('env') || [];
        let target: string[] = [];
        if (envs.length > 0 && !isEqual(envs, current)) {
          target = envs;
        } else if (args['update']) {
          target = envs.length > 0 ? envs : current;
        }
        if (target.length > 0) {
          await exec('lisa', [
            'install', ...target.map(name => `@lisa-env/${name}`),
            '--loglevel', 'info',
          ], {
            cwd: PACKAGE_HOME,
          });
          await set('env', target);
          await invalidateEnv();
        }
      }

      const env = await get('env');
      const mod = await loadBundles(env);
      task.title = `当前环境: ${env && mod.length > 0 ? env.join(', ') : '(未设置)'}`;
    },
    options: {
      bottomBar: 5,
    },
  });

  job('use-sdk', {
    title: 'SDK 设置',
    async task(ctx, task) {
      task.title = '';
      const exec = extendExec(cmd, { task });
      const argv = application.argv as ParsedArgs;

      const { args, printHelp } = parseArgs(application.argv, {
        'task-help': { short: 'h', help: '打印帮助' },
        'clear': { help: '清除设置' },
        'install': { help: '安装 SDK 中的组件' },
        'from-git': { arg: 'url#ref', help: '从指定仓库及分支初始化 SDK' },
        'manifest': { arg: 'file', help: '指定仓库中的 manifest 文件' },
        'update': { help: '更新当前SDK' },
        'mr': { arg: 'revision', help: '切换指定分支 SDK 并更新' },
        'list': { short: 'l', help: '列出当前SDK所有tag' }

      });
      const sdk = await get('sdk');
      const env = await getEnv();
      const ZEPHYR_BASE = env['ZEPHYR_BASE']
      const basicPath = resolve(ZEPHYR_BASE, '../')
      const westConfigPath = resolve(ZEPHYR_BASE, '../.west/config')
      if (args['task-help']) {
        return printHelp([
          'use-sdk [path] [--install]',
          'use-sdk <path> --from-git https://github.com/zephyrproject-rtos/zephyr.git#main',
          'use-sdk --clear',
        ]);
      }

      if (args['clear']) {
        await set('sdk', undefined);
        await invalidateEnv();
      } else if (args['update']) {
        await checkZephyrBase(ZEPHYR_BASE, westConfigPath);
        try {
          const manifestPath = await getManifestPath(basicPath);
          //  git pull--tags origin 拉取某个tag
          console.log('SDK 代码更新中...');
          await cmd('git', ['fetch', 'origin'], {
            env,
            cwd: manifestPath,
          });
          await cmd('git', ['pull'], {
            env,
            cwd: manifestPath,
          });
          console.log('modules 更新中...');
          await cmd('python', ['-m', 'west', 'update'], {
            stdio: 'inherit',
            env,
            cwd: basicPath,
          })
        } catch (e: any) {
          const { stderr } = e
          throw new Error((stderr && JSON.stringify(stderr)) || JSON.stringify(e));
        }
        return task.title = 'SDK更新成功';
      } else if (args['mr']) {
        const branch = args.mr;
        await checkZephyrBase(ZEPHYR_BASE, westConfigPath);
        try {
          const manifestPath = await getManifestPath(basicPath);
          await cmd('git', ['fetch', 'origin'], {
            env,
            cwd: manifestPath,
          });
          await cmd('git', ['checkout', branch || 'master'], {
            env,
            cwd: manifestPath
          });
          await cmd('git', ['fetch', 'origin', branch || 'master'], {
            stdio: 'inherit',
            env,
            cwd: manifestPath
          });
          await cmd('python', ['-m', 'west', 'update'], {
            stdio: 'inherit',
            env,
            cwd: basicPath
          })
        } catch (e: any) {
          const { stderr } = e
          throw new Error((stderr && JSON.stringify(stderr)) || JSON.stringify(e));
        }
        return task.title = `SDK 分支已切换到 ${branch}`;
      } else if (args['list']) {
        await checkZephyrBase(ZEPHYR_BASE, westConfigPath)
        try {
          const manifestPath = await getManifestPath(basicPath);
          // task.title = `当前 SDK tag list`;
          console.log(`当前 SDK tag list`);
          await exec('git', ['ls-remote', '-t'], {
            env,
            cwd: manifestPath,
            // stdio: 'pipe'
          });
        } catch (e: any) {
          const { stderr } = e
          throw new Error((stderr && JSON.stringify(stderr)) || JSON.stringify(e));
        }
        return
      } else {

        const path = argv._[1];
        const current = sdk;
        const target = path || current;
        // install
        let install = args['install'] || (path && path != current);
        if (target && /.*[\u4e00-\u9fa5]+.*$/.test(target)) {
          throw new Error(`SDK 路径不能包含中文: ${target}`);
        }
        if (target && install) {
          let zephyrPath = resolve(target);
          // 可能存在zephyr或zephyr.git两个命名的文件夹
          let pathNested = ['', 'zephyr', 'zephyr.git'];
          let isZephyrBase = false;
          for (const nested of pathNested) {
            if (await zephyrVersion(join(zephyrPath, nested))) {
              zephyrPath = join(zephyrPath, nested);
              isZephyrBase = true;
              break;
            }
          }
          if (!isZephyrBase) {
            throw new Error(`该路径不是一个 Zephyr base: ${zephyrPath}`);
          }
          await exec('python', [
            '-m', 'pip',
            'install', '-r', join(zephyrPath, 'scripts', 'requirements.txt'),
          ], { env: await getEnv() });
          await set('sdk', zephyrPath);
          await invalidateEnv();
        }

        //from-git
        const fromGit = args['from-git'];
        if (fromGit && fromGit.match(/(.+?)(?:#(.+))?$/)) {

          const { $1: url, $2: rev } = RegExp;
          if (!path) {
            throw new Error('未指定 SDK 路径');
          }
          const workspacePath = resolve(path);
          const env = await getEnv();
          delete env.ZEPHYR_BASE;
          const initArgs = ['init'];
          initArgs.push('--manifest-url', url);
          if (rev) initArgs.push('--manifest-rev', rev);
          if (args['manifest']) initArgs.push('--manifest-file', args['manifest']);
          initArgs.push(workspacePath);
          await exec('python', ['-m', 'west', ...initArgs], { env });

          await exec('python', ['-m', 'west', 'update'], { env, cwd: workspacePath });

          install = true;
        }

      }
      const version = sdk ? await zephyrVersion(sdk) : null;
      const branch = sdk ? await getRepoStatus(sdk) : null;
      if (sdk && version) {
        if (branch) {
          task.title = `当前 SDK: Zephyr ${version}(分支 ${branch}, 位于 ${sdk})`;
        } else {
          task.title = `当前 SDK: Zephyr ${version}(位于 ${sdk})`;
        }
      } else {
        task.title = '当前 SDK: (未设置)';
      }
    },
    options: {
      bottomBar: 5,
    },
  });

}

const getManifestPath = async (basicPath: string) => {
  const { stdout } = await Lisa.cmd('python', ['-m', 'west', 'config', 'manifest.path'], {
    env: await getEnv(),
    cwd: basicPath
  });
  return join(basicPath, stdout);
}
