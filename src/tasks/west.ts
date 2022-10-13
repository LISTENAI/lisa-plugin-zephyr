import { LisaType, job } from "../utils/lisa_ex";
// import { ParsedArgs } from 'minimist';
import { resolve, join } from "path";
import { pathExists, remove } from "fs-extra";

import { getEnv } from "../env";

// import parseArgs from '../utils/parseArgs';
// import extendExec from "../utils/extendExec";
// import { workspace } from '../utils/ux';
// import { getCMakeCache } from '../utils/cmake';
import { get } from "../env/config";
import { platform } from "os";
import { venvLib } from "../venv";
import { testLog } from "../utils/testLog";

export default ({ application, cmd }: LisaType) => {
  job("test", {
    title: "测试",
    async task(ctx, task) {
      task.title = "";
      if (platform() === "win32") {
        throw new Error("该命令暂不支持在 windows 下执行");
      }
      const current = await get("sdk");
      if (!current) {
        throw new Error("当前 SDK 未设置，请使用 use-sdk 命令进行设置");
      }
      const twister = join(current, "scripts/twister");
      if (!(await pathExists(twister))) {
        throw new Error("当前 SDK 中缺失 twister 测试Runner，请检查 SDK");
      }
      const argv = process.argv.slice(4);
      await cmd(twister, [...argv], {
        stdio: "inherit",
        env: await getEnv(),
      });
      testLog(task, "测试成功");
    },
  });

  job("doctor", {
    title: "doctor",
    async task(ctx, task) {
      task.title = "";
      if (process.platform == "win32") {
        await remove(await venvLib());
        try {
          await cmd("lisa", ["zep", "install"], {
            stdio: "inherit",
            env: await getEnv(),
          });
          const sdk = await get("sdk");
          if (sdk) {
            await cmd("lisa", ["zep", "use-sdk", "--install"], {
              stdio: "inherit",
              env: await getEnv(),
            });
          }
          testLog(task, "doctor 成功");
        } catch (error) {}
      }
    },
  });

  // if (process.env.LISA_ZEP_EXEC) {
  job("exec", {
    title: "exec",
    async task(ctx, task) {
      task.title = '';
      const execArgsIndex = process.argv.indexOf("exec");
      const execArgs = process.argv.slice(execArgsIndex + 1);
      const command = execArgs.shift();
      if (!command) return;

      try {
        await cmd(command, execArgs, {
          stdio: "inherit",
          env: await getEnv(),
        });
      } catch (error) {
        task.title = 'exec exit';
        throw new Error(`Command failed : ${command} ${execArgs.join(' ')}`)
      }

      task.title = 'exec exit';
    }
  });
  // }

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
};
