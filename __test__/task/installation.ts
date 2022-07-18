import lisa from "@listenai/lisa_core";
import { PLUGIN_HOME } from "../../src/env/config";
import { pathExists } from "fs-extra";
import { join } from "path";
const { cmd } = lisa;

export const testInstallation = () =>
  describe("测试 环境安装/卸载", () => {
    beforeAll(async () => {});
    test("test: uninstall", async () => {
      await cmd("lisa", ["zep", "uninstall"]);
      const HAS_PLUGIN_HOME = await pathExists(PLUGIN_HOME);
      expect(HAS_PLUGIN_HOME).toEqual(false);
    });
    test("test: install", async () => {
      const { stdout } = await cmd("lisa", ["zep", "install"]);
      expect(stdout).toMatch("安装成功");
      const ENV_CACHE_DIR = join(PLUGIN_HOME, "envs");
      const HAS_PLUGIN_HOME = await pathExists(PLUGIN_HOME);
      const HAS_ENV_CACHE_DIR = await pathExists(ENV_CACHE_DIR);
      expect(HAS_PLUGIN_HOME).toEqual(true);
      expect(HAS_ENV_CACHE_DIR).toEqual(false);
    });
  });
