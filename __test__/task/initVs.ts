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
      const { stdout } = await testCmd("lisa", ["zep", "init-vs", "csk6-dsp"], {
        input: "testcode\n",
      });
      const XTENSA_SYSTEM = env.XTENSA_SYSTEM;
      const XTENSA_TOOL = join(
        XTENSA_SYSTEM.split("venus_hifi4")[0],
        "XtensaTools/bin/xt-gdb.exe"
      );

      if (!XTENSA_SYSTEM) {
        expect(stdout).toThrowError(`需要设置 XTENSA_SYSTEM`);
        if (!(await pathExists(XTENSA_TOOL))) {
          expect(stdout).toThrowError(`xt-gdb不存在`);
        }
      } else {
        const targetDir = join(process.cwd(), ".vscode");
        const configFIle = join(targetDir, "xt-ocd-config.xml");
        const Launchfile = join(targetDir, "launch.json");
        expect(await pathExists(targetDir)).toEqual(true);
        expect(await pathExists(configFIle)).toEqual(true);
        expect(await pathExists(Launchfile)).toEqual(true);
        await remove(targetDir);
      }
    });
  });
