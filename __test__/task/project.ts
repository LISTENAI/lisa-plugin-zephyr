import { testCmd, TEST_SDK_DIR } from "../utils";
import { join, resolve } from "path";
import { pathExists, copy, remove } from "fs-extra";
import { getEnv } from "../../src/env";

export const testPorject = () =>
  describe("测试 build/flash", () => {
    let SMAPLE_DIR: string;
    let SMAPLE_BUILD_DIR: string;
    beforeAll(async () => {
      await testCmd("lisa", ["zep", "use-env", "csk6"]);
      const { stdout } = await testCmd("lisa", ["info", "zephyr"]);
      console.log(stdout);
      const env = await getEnv();
      let ZEPHYR_BASE = join(env["ZEPHYR_BASE"]);
      const TEST_SAMPLE_DIR = join(ZEPHYR_BASE, "samples/hello_world");
      SMAPLE_DIR = resolve(ZEPHYR_BASE, "../", "hello_world");
      SMAPLE_BUILD_DIR = resolve(ZEPHYR_BASE, "../", "hello_world", "build");
      console.log("ZEPHYR_BASE--->", ZEPHYR_BASE);
      console.log("TEST_SAMPLE_DIR--->", TEST_SAMPLE_DIR);
      console.log("SMAPLE_DIR--->", SMAPLE_DIR);
      console.log("SMAPLE_BUILD_DIR--->", SMAPLE_BUILD_DIR);
      if (await pathExists(TEST_SAMPLE_DIR)) {
        await copy(TEST_SAMPLE_DIR, SMAPLE_DIR);
      }
    });
    test("test: build", async () => {
      const { stdout } = await testCmd("lisa", [
        "zep",
        "build",
        SMAPLE_DIR,
        "-b",
        "csk6001_tester",
        "--build-dir",
        SMAPLE_BUILD_DIR,
      ]);
      const EXIT_SMAPLE_BUILD_DIR = await pathExists(SMAPLE_BUILD_DIR);
      expect(stdout).toMatch("成功");
      expect(EXIT_SMAPLE_BUILD_DIR).toEqual(true);
    });
    test("test: flash", async () => {
      const { stdout } = await testCmd("lisa", ["zep", "flash"]);
      expect(stdout).toMatch("成功");
    });
  });
