import { platform } from "os";
import { get } from "../../src/env/config";
import { join } from "path";
import { pathExists } from "fs-extra";
import { testCmd, TEST_SDK_DIR } from "../utils";

export const testWest = () =>
  describe("测试 west", () => {
    beforeAll(async () => {
      // await testCmd("lisa", ["zep", "use-sdk", TEST_SDK_DIR]);
    });
    test("test: west", async () => {
      const current: string = (await get("sdk")) || "";
      try {
        const { stdout } = await testCmd("lisa", ["zep", "test"]);
        console.log(stdout);
        expect(stdout).toMatch("测试成功");
      } catch (e: any) {
        console.log(e.message);
        if (platform() === "win32") {
          expect(e.message).toMatch("该命令暂不支持在 windows 下执行");
        }
        const twister = join(current, "scripts/twister");
        if (!(await pathExists(twister))) {
          expect(e.message).toThrowError(
            "当前 SDK 中缺失 twister 测试Runner，请检查 SDK"
          );
        }
      }
    });
    test("test: doctor", async () => {
      const { stdout } = await testCmd("lisa", ["zep", "doctor"]);
      if (platform() === "win32") {
        expect(stdout).toMatch("doctor 成功");
      }
    });
  });
