import { join } from "path";
import { getEnv, PACKAGE_HOME, loadBundles } from "../../src/env";
import { pathExists, copy, remove } from "fs-extra";
import { zephyrVersion } from "../../src/utils/sdk";
import { get, PLUGIN_HOME } from "../../src/env/config";
import { testCmd, TEST_DIR, TEST_SDK_DIR } from "../utils";

export const testEnvironment = () =>
  describe("测试 SDK设置", () => {
    let tags: any;
    afterAll(async () => {});
    test("test: use-sdk --from-git", async () => {
      if (!(await pathExists(TEST_SDK_DIR))) {
        const { stdout } = await testCmd("lisa", [
          "zep",
          "use-sdk",
          TEST_SDK_DIR,
          "--from-git",
          "https://cloud.listenai.com/zephyr/manifest.git",
        ]);
        expect(stdout).toMatch("成功");
      } else {
        let TEST_ZEPHYR_BASE;
        let pathNested = ["", "zephyr", "zephyr.git"];
        for (const nested of pathNested) {
          if (await zephyrVersion(join(TEST_SDK_DIR, nested))) {
            TEST_ZEPHYR_BASE = join(TEST_SDK_DIR, nested);
            break;
          }
        }
        const { stdout } = await testCmd("lisa", [
          "zep",
          "use-sdk",
          TEST_ZEPHYR_BASE,
        ]);
        const env = await getEnv();
        const ZEPHYR_BASE = join(env["ZEPHYR_BASE"]);
        console.log(stdout);
        expect(stdout).toMatch("SDK设置成功");
        expect(ZEPHYR_BASE).toEqual(TEST_ZEPHYR_BASE);
      }
    });

    test("test: use-sdk --list", async () => {
      const { stdout } = await testCmd("lisa", ["zep", "use-sdk", "--list"]);
      const arr = stdout.match(/refs\/tags\/(.*)/) || [];
      tags = arr[1];
      expect(stdout).toMatch("成功");
    });

    test("test: use-sdk --update", async () => {
      const { stdout } = await testCmd("lisa", ["zep", "use-sdk", "--update"]);
      expect(stdout).toMatch("SDK更新成功");
    });
    test("test: use-sdk --mr", async () => {
      const { stdout } = await testCmd("lisa", [
        "zep",
        "use-sdk",
        "--mr",
        tags,
      ]);
      expect(stdout).toMatch("SDK分支切换成功");
    });

    test("test: use-sdk  --install", async () => {
      const { stdout } = await testCmd("lisa", ["zep", "use-sdk", "--install"]);
      expect(stdout).toMatch("SDK设置成功");
    });
    test("test: use-sdk  --clear", async () => {
      await testCmd("lisa", ["zep", "use-sdk", "--clear"]);
      const env = await get("env");
      const ENV_CACHE_DIR = join(PLUGIN_HOME, "envs");
      const isExists = await pathExists(ENV_CACHE_DIR);
      expect(env).toBeUndefined();
      expect(isExists).toEqual(false);
    });
    // test("test: use-sdk  [directory]", async () => {
    //   let TEST_ZEPHYR_BASE;
    //   let pathNested = ["", "zephyr", "zephyr.git"];
    //   for (const nested of pathNested) {
    //     if (await zephyrVersion(join(TEST_SDK_DIR, nested))) {
    //       TEST_ZEPHYR_BASE = join(TEST_SDK_DIR, nested);
    //       break;
    //     }
    //   }
    //   const { stdout } = await testCmd("lisa", [
    //     "zep",
    //     "use-sdk",
    //     TEST_ZEPHYR_BASE,
    //   ]);
    //   const env = await getEnv();
    //   const ZEPHYR_BASE = join(env["ZEPHYR_BASE"]);
    //   expect(stdout).toMatch("SDK设置成功");
    //   expect(ZEPHYR_BASE).toEqual(TEST_ZEPHYR_BASE);
    // });
    test("test: use-env", async () => {
      const { stdout } = await testCmd("lisa", ["zep", "use-env", "csk6-dsp"]);
      expect(stdout).toMatch("编译环境操作成功");
      const env = await get("env");
      expect(env).toContain("csk6-dsp");
      const EXIT_PACKAGE_HOME = await pathExists(PACKAGE_HOME);
      expect(EXIT_PACKAGE_HOME).toEqual(true);
      const mod = await loadBundles(env);
      expect(mod.length).toBeGreaterThan(0);
    });

    test("test: use-env --update", async () => {
      const { stdout } = await testCmd("lisa", ["zep", "use-env", "--update"]);
      expect(stdout).toMatch("编译环境操作成功");
    });

    test("test: use-env --clear", async () => {
      const { stdout } = await testCmd("lisa", ["zep", "use-env", "--clear"]);
      expect(stdout).toMatch("编译环境操作成功");
      const env = await get("env");
      const ENV_CACHE_DIR = join(PLUGIN_HOME, "envs");
      const isExists = await pathExists(ENV_CACHE_DIR);
      expect(env).toBeUndefined();
      expect(isExists).toEqual(false);
    });
  });
