import { LisaType, job } from "../utils/lisa_ex";
import { join, resolve } from "path";
import { mkdirs, remove, pathExists } from "fs-extra";

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
      const requirementsPath = join(process.env.LISA_HOME || "", "lisa-zephyr", "whl");
      const isExists = await pathExists(requirementsPath);
      application.debug(`PLUGIN_HOME:${PLUGIN_HOME},venv.homeDir:${venv.homeDir},requirementsPath:${requirementsPath},isExists:${isExists}`);
      // console.log(`PLUGIN_HOME:${PLUGIN_HOME},venv.homeDir:${venv.homeDir},requirementsPath:${requirementsPath},isExists:${isExists}`)
      await exec(join(python.binaryDir, "python"), [
        "-m",
        "venv",
        venv.homeDir,
      ]);
      //装requirement.txt whl的离线包
      isExists ? await exec("python", ["-m", "pip", "install", "-r", join(requirementsPath, "local_requirements.txt"), "-f", "./dependencies", "--no-index"], {
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
