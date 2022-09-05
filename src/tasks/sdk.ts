import { LisaType, job } from "../utils/lisa_ex";
import { ParsedArgs } from "minimist";
import { resolve, join } from "path";
import { pathExists, remove } from "fs-extra";
import { getEnv } from "../env";
import { get } from "../env/config";
import { zephyrVersion, sdkTag } from "../utils/sdk";
import extendExec from "../utils/extendExec";
const path7za = require('7zip-bin').path7za;
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
            }
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
          //进use-sdk逻辑
          await cmd("lisa", ["zep", "use-sdk"].concat(addArgs), {
            stdio: "inherit",
          });
          console.log('')
        } else {
          //lisa zep sdk set
          //1 下载sdk 7z包 2 解压 3 use-sdk
          await cmd("lisa", ["zep", "use-sdk", "--clear"]);
          const sdkPath = resolve(join(process.env.LISA_HOME || "", "csk-sdk"));
          let hasZephyrPath = await pathExists(sdkPath)
          if (hasZephyrPath) {
            let zephyrPath = resolve(sdkPath);
            // 可能存在zephyr或zephyr.git两个命名的文件夹
            let pathNested = ["", "zephyr", "zephyr.git"];
            let isZephyrBase = false;
            for (const nested of pathNested) {
              if (await zephyrVersion(join(zephyrPath, nested))) {
                zephyrPath = join(zephyrPath, nested);
                isZephyrBase = true;
                break;
              }
            }
            if (isZephyrBase) {
              await cmd("lisa", ["zep", "use-sdk", sdkPath], { stdio: "inherit" });
              console.log('')
              return
            }
          }
          let mr = "";
          const res = await got(
            "https://cloud.listenai.com/api/v4/projects/554/repository/tags"
          );
          const released = (JSON.parse(res.body) as Array<any>).find(
            (item) => item.release && item.name.indexOf("beta")
          );
          mr = `${released.name}`;
          const url = `https://cdn.iflyos.cn/public/lisa-zephyr-dist/${mr}.7z`;
          //用户选择的安装目录 LISA_HOME
          application.download_path = sdkPath;
          // 下载sdk 
          if (sdkPath && /.*[\u4e00-\u9fa5]+.*$/.test(sdkPath)) {
            throw new Error(`SDK 路径不能包含中文: ${sdkPath}`);
          }

          const sdk7zPath = join(sdkPath, `${mr}.7z`);
          application.debug(
            "sdk下载",
            "\n",
            process.env.LISA_HOME,
            "\n",
            url,
            "\n",
            sdk7zPath,
            "\n",
            sdkPath
          );
          console.log("正在下载sdk...");
          console.time("download");
          const customBar = cli.progress({
            format: 'Download SDK Progress [ {bar} ] {percentage}% ',
          },)
          customBar.start(100, 0, {
            speed: "N/A"
          });

          await fs.project.downloadFile({
            url,
            fileName: `${mr}.7z`,
            targetDir: sdkPath,
            progress: (percentage: number, transferred: number, total: number) => {
              customBar.update(percentage);
              if (percentage === 100) {
                customBar.stop()
              }
            }
          });
          if (!(await pathExists(sdk7zPath))) {
            throw new Error(`SDK 压缩包不存在: ${sdk7zPath}`);
          }
          customBar.stop()
          console.timeEnd("download");
          console.time("unzip");
          await cmd("lisa", ["zep", "sdk", "7z", sdk7zPath, sdkPath], { stdio: "inherit" });
          console.timeEnd("unzip");
          console.log("done");
          await cmd("lisa", ["zep", "use-sdk", sdkPath], { stdio: "inherit" });
          const env = await getEnv();
          const ZEPHYR_BASE = env["ZEPHYR_BASE"];
          await cmd("git", ["config", "core.filemode", "false"], {
            env,
            cwd: ZEPHYR_BASE,
          });
          await remove(sdk7zPath);
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
      if (args === '7z') { 
        const addArgs = process.argv.slice(5);
        const zipDir = addArgs[0];
        const targetDir = addArgs[1];
        console.log("正在解压sdk...");
        await cmd(path7za,[
          "x",
          "-y",
          zipDir,
          `-o${targetDir}`,
        ],{ stdio: "inherit"})
      }

      task.title = "结束";
    },
    options: {
      bottomBar: 5,
    },
  });
};
