import { LisaType, job } from "../utils/lisa_ex";
import { undertake } from "../main";
import { flashFlags } from "../utils/westConfig";
import { testLog } from "../utils/testLog";

export default ({ application, cmd }: LisaType) => {
  job("build", {
    title: "构建",
    async task(ctx, task) {
      task.title = "";
      const res = await undertake();
      task.title = res ? "构建成功" : "构建失败";
      testLog(task, res ? "构建成功" : "构建失败");
    },
  });

  job("flash", {
    title: "烧录",
    async task(ctx, task) {
      task.title = "";
      const res = await undertake(await flashFlags());
      task.title = res ? "烧录成功" : "烧录失败";
      testLog(task, res ? "烧录成功" : "烧录成功");
    },
  });
};
