import { LisaType, job } from "../utils/lisa_ex";
import { ParsedArgs } from "minimist";
import { undertake } from "../main";
import { flashFlags } from "../utils/westConfig";
import { testLog } from "../utils/testLog";
import AppProject from "../models/appProject";
import { workspace } from "../utils/ux";
import { pathExists } from "fs-extra";
import { join, basename } from "path";
import { getKconfig } from '../utils/kconfig';
import { get } from '../env/config';
import simpleGit from 'simple-git';
import { getCommit } from '../utils/repo';
import Lpk from '@tool/lpk';

async function getAppFlashAddr(buildDir: string): Promise<number> {
  const hasLoadOffset = await getKconfig(buildDir, 'CONFIG_HAS_FLASH_LOAD_OFFSET');
  if (hasLoadOffset != 'y') return 0;
  const loadOffset = parseInt(await getKconfig(buildDir, 'CONFIG_FLASH_LOAD_OFFSET') ?? '');
  return isNaN(loadOffset) ? 0 : loadOffset;
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

      const argv = application.argv as ParsedArgs;
      const log = argv.hasOwnProperty('lscloud-log') ? !!argv['lscloud-log'] : true;

      const lpk = new Lpk();
      const buildDir = join(process.cwd(), 'build');
      lpk.setName(basename(process.cwd()));
      if (!(await pathExists(join(buildDir, 'zephyr', '.config')))) {
        throw new Error("请先编译出固件再进行生成lpk包");
      }
      
      const configBoard = await getKconfig(buildDir, 'CONFIG_BOARD') || '';

      await lpk.setChip((configBoard.match(/csk\d{4}/g) || [])[0] || '');
      if (log) {
        await lpk.setLSCloudInfo();
      }
      await lpk.setVersion();

      const sdk = await get('sdk');
      if (!sdk) return null;
      if (!(await pathExists(sdk))) return null;
      const git = simpleGit(sdk);
      lpk.setAppver(`[sdk-commit]${await getCommit(git)};`)

      await lpk.addImage(join(buildDir, 'zephyr', 'zephyr.bin'), await getAppFlashAddr(buildDir)+'')
      
      const res = await lpk.pack(join(buildDir))

      if (process.env.NODE_ENV === 'test') {
        console.log(res);
      } else {
        console.log(`\noutput => ${res}`);
      }

      task.title = "完成";
    }
  })
};
