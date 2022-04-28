import { testCmd } from "../utils";
import { getEnv } from "../../src/env";
import { join } from "path";
import { pathExists, remove } from "fs-extra";

export const testIinitVs = () =>
  describe("测试 生成vscode debug runner", () => {
    beforeAll(async () => {
      await testCmd("lisa", ["zep", "use-env", "csk6-dsp"]);
    });
    test("test: init-vs", async () => {
      const env = await getEnv();
      const XTENSA_SYSTEM = env.XTENSA_SYSTEM;
      const XTENSA_TOOL = join(
        XTENSA_SYSTEM.split("venus_hifi4")[0],
        "XtensaTools/bin/xt-gdb.exe"
      );
      const targetDir = join(process.cwd(), ".vscode");

      try {
        const { stdout } = await testCmd(
          "lisa",
          ["zep", "init-vs", "csk6-dsp"],
          {
            input: "testcode\n",
          }
        );
        expect(stdout).toMatch("测试成功");
        console.log(stdout);
        const configFIle = join(targetDir, "xt-ocd-config.xml");
        const Launchfile = join(targetDir, "launch.json");
        expect(await pathExists(targetDir)).toEqual(true);
        expect(await pathExists(configFIle)).toEqual(true);
        expect(await pathExists(Launchfile)).toEqual(true);
      } catch (e: any) {
        console.log(e.message);
        if (!XTENSA_SYSTEM) {
          expect(e.message).toThrowError(`需要设置 XTENSA_SYSTEM`);
          if (!(await pathExists(XTENSA_TOOL))) {
            expect(e.message).toThrowError(`xt-gdb不存在`);
          }
        }
      }
      await remove(targetDir);
    });
  });
