import { LisaType, job } from "../utils/lisa_ex";
import { join, resolve } from "path";
import {
  readFile,
  copy,
  writeFile,
  readJson,
  pathExists,
  remove,
  rename,
  mkdir,
} from "fs-extra";

import { getEnv, getBinarie } from "../env";
import { get } from "../env/config";
import parseArgs from "../utils/parseArgs";
import { testLog } from "../utils/testLog";
import { platform } from "os";

export default ({ application, cmd }: LisaType) => {
  job("init-vs", {
    title: "生成vscode debug runner",
    async task(ctx, task) {
      const availableSdks = ["csk6-dsp", "csk6"];
      const current = await get("env");
      const env = await getEnv();
      let XTENSA_TOOL: string = "";
      let JLINK_TOOL: string = "";
      let JLinkGDBServerCL: string = "";
      if (platform() !== "win32") {
        throw new Error("该命令暂只支持在 windows 下执行");
      }
      const { args } = parseArgs(application.argv, {
        env: { arg: "name", help: "生成vscode debug runner" },
      });
      if (!current) {
        throw new Error(`需要设置 编译环境 (lisa zep use-env [path])`);
      }
      if (!args["env"]) {
        throw new Error(`需要指定编译环境 (--env [env])`);
      } else if (!availableSdks.includes(args["env"])) {
        throw new Error(`暂不支持其他SDK`);
      }
      if (args["env"] === "csk6-dsp") {
        const XTENSA_SYSTEM = env.XTENSA_SYSTEM;
        if (!XTENSA_SYSTEM) {
          throw new Error(`需要设置 XTENSA_SYSTEM`);
        } else {
          XTENSA_TOOL = join(
            XTENSA_SYSTEM.split("venus_hifi4")[0],
            "XtensaTools/bin/xt-gdb.exe"
          );
          if (!(await pathExists(XTENSA_TOOL))) {
            throw new Error(`xt-gdb不存在: ${XTENSA_TOOL}`);
          }
        }
      }
      if (args["env"] === "csk6") {
        const JLINK = await getBinarie("jlink-venus");
        JLINK_TOOL = JLINK && JLINK.homeDir;
        if (!JLINK_TOOL || !(await pathExists(JLINK_TOOL))) {
          throw new Error(`需要设置 jlink-venus`);
        } else {
          JLinkGDBServerCL = join(JLINK.homeDir, "JLinkGDBServerCL.exe");
          if (!(await pathExists(JLinkGDBServerCL))) {
            throw new Error(`缺少必要文件：${JLinkGDBServerCL}`);
          }
        }
      }
      const targetDir = join(process.cwd(), ".vscode");
      const formDir = join(__dirname, "..", "..", "vscode");
      const Launchfile = join(formDir, `launch_${args["env"]}.json`);
      await remove(targetDir);
      if (args["env"] === "csk6-dsp") {
        const jlinkSNcode =
          ctx.jlinkSNcode ||
          (await task.prompt({
            type: "input",
            name: "value",
            message: "请输入jlink 的 `SN` 码",
            initial: ".",
          }));
        ctx.jlinkSNcode = jlinkSNcode;
        await mkdir(targetDir);
        const configFIle = join(formDir, "xt-ocd-config.xml");
        const configFileStr = await readFile(configFIle, "utf8");
        const result = configFileStr.replace(/###usbser###/g, jlinkSNcode);
        await writeFile(join(targetDir, "xt-ocd-config.xml"), result, "utf-8");
        const launchJson = await readJson(Launchfile);
        launchJson.configurations[0].linux.miDebuggerPath = XTENSA_TOOL || "";
        await writeFile(
          join(targetDir, `launch.json`),
          JSON.stringify(launchJson, null, "\t")
        );
      } else {
        await mkdir(targetDir);
        const launchJson = await readJson(Launchfile);
        launchJson.configurations[0].serverpath = JLinkGDBServerCL || "";
        launchJson.configurations[0].armToolchainPath = JLINK_TOOL || "";
        await writeFile(
          join(targetDir, `launch.json`),
          JSON.stringify(launchJson, null, "\t")
        );
      }
      testLog(task, "成功");
    },
  });
};
