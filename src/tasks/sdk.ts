import { LisaType, job } from "../utils/lisa_ex";
import { ParsedArgs } from "minimist";
import { resolve, join } from "path";
import { pathExists, remove } from "fs-extra";
import { getEnv } from "../env";
import { get } from "../env/config";
import { sdkTag } from "../utils/sdk";
import { getRepoStatus } from "../utils/repo";
import { testLog } from "../utils/testLog";
import extendExec from "../utils/extendExec";

async function checkZephyrBase(ZEPHYR_BASE: string, westConfigPath: string) {
  if (!ZEPHYR_BASE) {
    return false;
  }
  if (!(await pathExists(westConfigPath))) {
    return false;
  }
  return true;
}
export default ({ application, cmd, got, fs, cli }: LisaType) => {
  job("sdk", {
    title: "SDK 设置",
    async task(_ctx, task) {
      task.title = "";
      const exec = extendExec(cmd, { task });
      const argv = application.argv as ParsedArgs;
      const args = argv._[1];
      const env = await getEnv();
      const ZEPHYR_BASE = env["ZEPHYR_BASE"];
      const westConfigPath = ZEPHYR_BASE
        ? resolve(ZEPHYR_BASE, "../.west/config")
        : "";
      const hasSDK = await checkZephyrBase(ZEPHYR_BASE, westConfigPath);
      //交互式
      if (!args) {
        let opts: Array<any>;
        if (!hasSDK) {
          opts = [
            {
              name: "下载并安装SDK",
              command: "set",
            },
          ];
        } else {
          opts = [
         
            {
              name: "切换SDK版本",
              command: "use",
            },
            {
              name: "重新安装SDK",
              command: "set",
            },
          ];
        }
        const option = await task.prompt({
          type: "select",
          name: "value",
          message: "请选择sdk操作",
          choices: opts.map((item: any) => item.name),
        });
        const opt: any = opts.find((item) => item.name === option);
        await cmd("lisa", ["zep", "sdk", opt.command], { stdio: "inherit" });
      }
      if (args === "set") {
        const addArgs = process.argv.slice(5);
        if (addArgs.length > 0) {
          await cmd("lisa", ["zep", "use-sdk"].concat(addArgs), {
            stdio: "inherit",
          });
        } else {
          //lisa zep sdk set
          //1 下载sdk zip包 2 解压 3 use-sdk
          await cmd("lisa", ["zep", "use-sdk", "--clear"], {
            stdio: "inherit",
          });
          let mr = "";
          const res = await got(
            "https://cloud.listenai.com/api/v4/projects/554/repository/tags"
          );
          const released = (JSON.parse(res.body) as Array<any>).find(
            (item) => item.release && item.name.indexOf("beta")
          );
          mr = `${released.name}`;
          const url = `https://cdn.iflyos.cn/public/lisa-zephyr-dist/${mr}.tar.zst`;
          //用户选择的安装目录 LISA_HOME
          const sdkPath = resolve(join(process.env.LISA_HOME || "", "csk-sdk"));
          application.download_path = sdkPath;
          // 下载sdk .zst包
          if (sdkPath && /.*[\u4e00-\u9fa5]+.*$/.test(sdkPath)) {
            throw new Error(`SDK 路径不能包含中文: ${sdkPath}`);
          }

          const sdkZSTPath = join(sdkPath, `${mr}.tar.zst`);
          application.debug(
            "sdk下载",
            "\n",
            process.env.LISA_HOME,
            "\n",
            url,
            "\n",
            sdkZSTPath,
            "\n",
            sdkPath
          );
          // console.log('sdk下载', '\n', process.env.LISA_HOME, '\n', url, '\n', sdkZSTPath, '\n', sdkPath);
          cli.action.start("正在下载sdk...");
          await fs.project.downloadFile({
            url,
            fileName: `${mr}.tar.zst`,
          });
          if (!(await pathExists(sdkZSTPath))) {
            throw new Error(`SDK zst包不存在: ${sdkZSTPath}`);
          }
          cli.action.stop("下载sdk完成");
          cli.action.start("正在解压sdk...");
          const pluginDir = join(__dirname, "..", "..", "plugin");
          const sdkZipPath = join(sdkPath, `${mr}.tar`);
          await exec(join(pluginDir, "zstd.exe"), ["-d", sdkZSTPath]);
          await exec(join(pluginDir, "7z.exe"), [
            "x",
            sdkZipPath,
            `-o${sdkPath}`,
          ]);
          cli.action.stop("解压sdk完成");
          await cmd("lisa", ["zep", "use-sdk", sdkPath], { stdio: "inherit" });
          const env = await getEnv();
          const ZEPHYR_BASE = env["ZEPHYR_BASE"];
          await cmd("git", ["config", "core.filemode", "false"], {
            env,
            cwd: ZEPHYR_BASE,
          });
          await remove(sdkZSTPath);
          await remove(sdkZipPath);
        }
      }
      if (args === "use") {
        if (!hasSDK) {
          throw new Error(`当前 SDK 未初始化，需要设置 SDK (lisa zep sdk )`);
        }
        const sdk = await get("sdk");
        const version = sdk ? await sdkTag(sdk) : null;
        const res = await got(
          "https://cloud.listenai.com/api/v4/projects/554/repository/tags"
        );
        // let tags = (JSON.parse(res.body) as Array<any>).filter(
        //   (item) => item.name && item.name.indexOf("beta") < 0
        // );
        let tags = JSON.parse(res.body);
        tags.forEach((item: any) => {
          if (item.name === version) {
            item.name = item.name + "(current)";
          }
        });
        const tagName = await task.prompt({
          type: "select",
          name: "value",
          message: "请选择切换的分支",
          choices: tags.map((item: any) => item.name),
        });

        if (version === tagName) {
          throw new Error(`当前 SDK 已经在此分支`);
        }
        console.log(`正在为您切换分支（${tagName}）`);
        await cmd("lisa", ["zep", "use-sdk", "--mr", tagName], {
          stdio: "inherit",
        });
      }
      const sdk = await get("sdk");
      const version = sdk ? await sdkTag(sdk) : null;
      const branch = sdk ? await getRepoStatus(sdk) : null;
      if (sdk && version) {
        if (branch) {
          task.title = `当前 SDK: Zephyr ${version}(分支 ${branch}, 位于 ${sdk})`;
        } else {
          task.title = `当前 SDK: Zephyr ${version}(位于 ${sdk})`;
        }
        testLog(task, `SDK设置成功 位于 ${sdk}`);
      } else {
        task.title = "当前 SDK: (未设置)";
        testLog(task, "SDK设置失败");
      }
    },
    options: {
      bottomBar: 5,
    },
  });
};
