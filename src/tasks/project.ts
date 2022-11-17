import { LisaType, job } from "../utils/lisa_ex";
import { ParsedArgs } from "minimist";
import { undertake } from "../main";
import { flashFlags } from "../utils/westConfig";
import { testLog } from "../utils/testLog";
import AppProject from "../models/appProject";
import { workspace } from "../utils/ux";
import { pathExists, readJSON } from "fs-extra";
import { join, basename } from "path";
import { getKconfig } from '../utils/kconfig';
import { get } from '../env/config';
import simpleGit from 'simple-git';
import { getCommit } from '../utils/repo';
import Lpk from '@tool/lpk';
import { loadDT } from "../utils/dt";
import { getEnv } from "../env";
import { getCMakeCache } from "../utils/cmake";
import parseArgs from "../utils/parseArgs";
import { Application } from "@listenai/lisa_core";
import {
  getPartitionInfo,
} from "../utils/fs";

async function getAppFlashAddr(buildDir: string): Promise<number> {
  const hasLoadOffset = await getKconfig(buildDir, 'CONFIG_HAS_FLASH_LOAD_OFFSET');
  if (hasLoadOffset != 'y') return 0;
  const loadOffset = parseInt(await getKconfig(buildDir, 'CONFIG_FLASH_LOAD_OFFSET') ?? '');
  return isNaN(loadOffset) ? 0 : loadOffset;
}

async function lpkHandle(application: Application, task: any) {
  const argv = application.argv as ParsedArgs;
  application.debug(argv)
  const log = argv.hasOwnProperty('lscloud-log') && argv['lscloud-log'] === 'false' ? false : true;
  const project =
    (await getCMakeCache("build", "APPLICATION_SOURCE_DIR", "PATH")) || "";
  if (!(await pathExists(project))) {
    throw new Error(`项目不存在: ${project}`);
  }
  const lpk = new Lpk();
  const buildDir = (await getCMakeCache("build", "APPLICATION_BINARY_DIR", "PATH")) || "";
  const resourceDir = join(project, 'resource');
  application.debug(buildDir, resourceDir)
  lpk.setName(basename(project));
  if (!(await pathExists(join(buildDir, 'zephyr', '.config')))) {
    throw new Error("请先编译出固件再进行生成lpk包");
  }

  const configBoard = await getKconfig(buildDir, 'CONFIG_BOARD') || '';

  await lpk.setChip((configBoard.match(/csk\d{4}/g) || [])[0] || '');
  if (!!log) {
    await lpk.setLSCloudInfo();
  }
  await lpk.setVersion();

  const sdk = await get('sdk');
  if (!sdk) return null;
  if (!(await pathExists(sdk))) return null;
  const git = simpleGit(sdk);
  lpk.setAppver(`[sdk-commit]${await getCommit(git)};`);
  // 是否存在resource/map.json
  const mapFile = join(resourceDir, 'map.json');
  if ((await pathExists(mapFile))) {
    const mapJson = await readJSON(mapFile);
    const dt = await loadDT('build', await getEnv());
    for (const key in mapJson) {
      const { path, required, address } = mapJson[key];
      const partition_file = path && join(project, path);
      if ((await pathExists(partition_file))) {
        if (address) {
          application.debug(partition_file, address);
          await lpk.addImage(partition_file, address + '');
          continue;
        }
        const partition = getPartitionInfo(dt, key);
        if (!partition) {
          return task.skip(`${path}该文件无分区信息`);
        } else {
          application.debug(partition_file, `0x${partition.addr.toString(16)}`);
          await lpk.addImage(partition_file, `0x${partition.addr.toString(16)}`);
        }
        continue;
      } else {
        if (required) throw new Error(`缺少必要文件${partition_file}`);
      }

    }
  } else {
    application.debug(join(buildDir, 'zephyr', 'zephyr.bin'), await getAppFlashAddr(buildDir) + '');
    await lpk.addImage(join(buildDir, 'zephyr', 'zephyr.bin'), await getAppFlashAddr(buildDir) + '');
  }
  const res = await lpk.pack(join(buildDir));
  if (process.env.NODE_ENV === 'test') {
    console.log(res);
  } else {
    console.log(`\noutput => ${res}`);
  }
}

export default ({ application, cmd, cli }: LisaType) => {

  job("init-app", {
    title: "初始化项目",
    async task(ctx, task) {
      task.title = "";
      const targetDir = workspace() || process.cwd();
      const app = new AppProject(targetDir);
      await app.init();
      task.title = "初始化成功";
    },
  });

  job("update", {
    title: "更新提货单projects",
    async task(ctx, task) {
      task.title = "";
      const targetDir = workspace() || process.cwd();
      const app = new AppProject(targetDir);
      await app.update();
      task.title = "更新成功";
      testLog(task, "更新成功");
    }
  })

  job("build", {
    title: "构建",
    async task(ctx, task) {
      task.title = "";
      await undertake();
      task.title = "构建成功";
      testLog(task, "构建成功");
    },
  });

  job("flash", {
    title: "烧录",
    async task(ctx, task) {
      task.title = "";
      await undertake(await flashFlags());
      task.title = "结束";
      testLog(task, "烧录成功");
    },
  });

  job("lpk", {
    title: "生成lpk包",
    async task(ctx, task) {
      task.title = "";
      await lpkHandle(application,task)
      task.title = "完成";
    }
  });
  // 新打包命令
  job("pack", {
    title: "打包",
    async task(ctx, task) {
      task.title = "";
      const { args, printHelp } = parseArgs(application.argv, {
        "task-help": { short: "h", help: "打印帮助" },
        lpk: { help: "生成lpk包" },
      });
      if (args["task-help"]) {
        return printHelp(["pack [--lpk]"]);
      }

      if (JSON.stringify(args) == "{}") {
        throw new Error(`需要指定打包类型 (比如:--lpk)`);
      }
      if (args["lpk"]) {
        // const addArgs = process.argv.slice(5);
        await lpkHandle(application, task)
        // await cmd("lisa", ["zep", "lpk"].concat(addArgs), {
        //   stdio: "inherit",
        // });
      }
      task.title = "完成";
    }
  });
};
