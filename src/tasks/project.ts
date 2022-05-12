import { LisaType, job } from "../utils/lisa_ex";
import { undertake } from "../main";
import { flashFlags } from "../utils/westConfig";
import { testLog } from "../utils/testLog";
import AppProject from "../utils/appProject";
import { workspace } from "../utils/ux";

export default ({ application, cmd }: LisaType) => {

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
      task.title = "烧录成功";
      testLog(task, "烧录成功");
    },
  });
};
