import { LisaType, job } from "../utils/lisa_ex";
import { join, resolve } from "path";
import { mkdirs, remove, pathExists, rename } from "fs-extra";
import { ParsedArgs } from "minimist";
import parseArgs from "../utils/parseArgs";

import extendExec from "../utils/extendExec";
import { getEnv, invalidateEnv } from "../env";
import { PLUGIN_HOME } from "../env/config";

import python from "@binary/python-3.9";
import venv from "../venv";
import { testLog } from "../utils/testLog";

export default ({ cmd, application }: LisaType) => {
  job("install", {
    title: "环境安装",
    async task(ctx, task) {
      const exec = extendExec(cmd, { task });
      await mkdirs(PLUGIN_HOME);
      await invalidateEnv();
      const whlPath = join(process.env.LISA_HOME || "", "lisa-zephyr", "whl");
      const requirementsPath = join(whlPath, "local_requirements.txt");
      const isExists = await pathExists(requirementsPath);
      const argv = application.argv as ParsedArgs;
      const { args, printHelp } = parseArgs(application.argv, {
        // "task-help": { short: "h", help: "打印帮助" },
        "online": { arg: "online", help: "python包走在线安装" },
      });
      application.debug(`PLUGIN_HOME:${PLUGIN_HOME},venv.homeDir:${venv.homeDir},requirementsPath:${requirementsPath},isExists:${isExists}`);
      

      const online = args.online
      
      await exec(join(python.binaryDir, "python"), [
        "-m",
        "venv",
        venv.homeDir,
      ]);

      application.debug(`存在:${isExists}，在线:${online}`);
      //装requirement.txt whl的离线包
      (isExists && !online) ? await exec("python", ["-m", "pip", "install", "-r", requirementsPath, "-f", "./dependencies", "--no-index"], {
        env: await getEnv(),
        cwd: requirementsPath
      }) :
        await exec("python", ["-m", "pip", "install", "west"], {
          env: await getEnv(),
        });
      await exec(
        "python",
        ["-m", "west", "config", "--global", "zephyr.base-prefer", "env"],
        { env: await getEnv() }
      );

      await invalidateEnv();
      if (isExists) {
        await rename(requirementsPath, join(whlPath, "local_requirements_back.txt"))
      }
      testLog(task, "安装成功");
    },
  });

  job("uninstall", {
    title: "环境卸载",
    async task(ctx, task) {
      await remove(PLUGIN_HOME);
    },
  });
};
