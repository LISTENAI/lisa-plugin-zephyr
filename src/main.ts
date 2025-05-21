import { promisify } from "util";
import { execFile as _execFile } from "child_process";
import { defaults } from "lodash";
import { pathExists } from "fs-extra";
import { loadBundles, loadBinaries, getEnv } from "./env";
import { PLUGIN_HOME, get } from "./env/config";
import { cskZephyrVersion, sdkTag, zephyrVersion } from "./utils/sdk";
import { getCommit, getBranch, clean } from "./utils/repo";
import Lisa from "@listenai/lisa_core";
import { venvScripts } from "./venv";
import simpleGit from "simple-git";
import execa from "execa";
import { workspace } from "./utils/ux";
import AppProject from "./models/appProject";
import { resolve, dirname } from "path";
import * as Sentry from "@sentry/node";
import { join } from "path";
import { connCheck } from "./utils/connCheck";
Sentry.init({
  dsn: "http://e1729ec787e54957b0252fff58844c80@sentry.iflyos.cn/106",
  tracesSampleRate: 1.0,
  maxValueLength: 10000,
});
const execFile = promisify(_execFile);

export async function env(): Promise<Record<string, string>> {
  let env = await get("env");
  // let env: string[] = [];
  let err = false;
  const bundles = await loadBundles(env);

  const versions: Record<string, string> = {};
  const variables: Record<string, string> = {};

  for (const [name, binary] of Object.entries(await loadBinaries(bundles))) {
    try {
      versions[name] = await binary.version();
    } catch (e) {
      versions[name] = redChar("(缺失)");
      err = true;
    }
    Object.assign(variables, binary.env);
  }

  if (bundles.length > 0) {
    const masterBundle = bundles[0];
    Object.assign(variables, masterBundle.env);
    for (const bundle of bundles.slice(1)) {
      defaults(variables, bundle.env);
    }
  } else {
    env = [];
  }
  let envShow = '';
  if (env && env.length > 0) {
    envShow = env.join(", ");
  } else {
    envShow = redChar("(未设置)");
    err = true;
  }

  let westShow = await getWestVersion();
  if (!westShow) {
    westShow = redChar("(未安装)");
    err = true;
  }

  if (err) {
    Object.assign(variables, {
      check: redChar('检查存在环境缺失，请看文档faq章节进行处理')
    });
  }

  try {
    await connCheck();
  } catch (e) {
    const errmsg = (e as Error).message;
    Object.assign(variables, {
      res: redChar(errmsg)
    });
  }

  return {
    env: envShow,
    west: westShow,
    ...versions,
    CSK_BASE: (await getCskInfo()) || (await getZephyrInfo()) || redChar("(未设置)"),
    ZEPHYR_BASE: (await getZephyrInfo()) || redChar("(未设置)"),
    PLUGIN_HOME,
    ...variables,
  };
}

async function getWestVersion(): Promise<string | null> {
  try {
    const { stdout } = await execFile("python", ["-m", "west", "--version"], {
      env: await getEnv(),
    });
    return stdout.trim();
  } catch (e) {
    return null;
  }
}

async function getCskInfo(): Promise<string | null> {
  const sdk = await get("sdk");
  if (!sdk) return null;
  if (!(await pathExists(sdk))) return null;

  let _sdkBasePath = sdk;
  const zepVer = await zephyrVersion(sdk);
  if (zepVer === '3.4.0') {
    _sdkBasePath = join(sdk, '..', 'csk');
  }
  const sdkBasePath = _sdkBasePath;
  const tag = await sdkTag(sdkBasePath);

  const git = simpleGit(sdkBasePath);
  const commit = await getCommit(git);
  const branch = await getBranch(git);
  const isClean = await clean(git);

  const commitMsg = `commit: ${commit}${isClean ? "" : "*"}`;

  if (tag && !branch) {
    return `${sdkBasePath} (版本: ${tag}, ${commitMsg})`;
  }
  if (branch) {
    return `${sdkBasePath} (分支: ${branch}, ${commitMsg})`;
  } else {
    return `${sdkBasePath} (${commitMsg})`;
  }
}

async function getZephyrInfo(): Promise<string | null> {
  const sdk = await get("sdk");
  if (!sdk) return null;
  if (!(await pathExists(sdk))) return null;
  const tag = await sdkTag(sdk);
  const git = simpleGit(sdk);
  const commit = await getCommit(git);
  const branch = await getBranch(git);
  const isClean = await clean(git);

  const commitMsg = `commit: ${commit}${isClean ? "" : "*"}`;

  if (tag && !branch) {
    return `${sdk} (版本: ${tag}, ${commitMsg})`;
  }
  if (branch) {
    return `${sdk} (分支: ${branch}, ${commitMsg})`;
  } else {
    return `${sdk} (${commitMsg})`;
  }
}

export const exportEnv = getEnv;

export async function undertake(
  argv?: string[] | undefined,
  options?: execa.Options<string> | undefined
): Promise<boolean> {
  argv = argv ?? process.argv.slice(3);
  const { cmd } = Lisa;

  const cwd = options?.cwd ?? process.cwd();
  const app = new AppProject(cwd);
  const topdir = (await app.topdir()) || "";
  const selfSDK = (await app.selfSDK()) || "";

  const env = await getEnv();
  if (
    env["ZEPHYR_BASE"] &&
    resolve(topdir) !== resolve(dirname(env["ZEPHYR_BASE"]))
  ) {
    delete env["ZEPHYR_BASE"];
  }

  if (selfSDK) {
    env["ZEPHYR_BASE"] = selfSDK;
  }

  //TODO: get sdk and set ZEPHYR_SDK_INSTALL_DIR
  const sdk = await get("sdk");
  if (!sdk) {
    throw new Error("sdk not found");
  }
  if (!(await pathExists(sdk))) {
    throw new Error("sdk not found");
  }

  const cskZepVer = await cskZephyrVersion(sdk);
  if (!cskZepVer) {
    throw new Error("sdk version not found");
  }
  switch (cskZepVer) {
    case 1:
      env['ZEPHYR_SDK_INSTALL_DIR'] = env['ZEPHYR_14_SDK_INSTALL_DIR'];
      break;
    case 2:
      env['ZEPHYR_SDK_INSTALL_DIR'] = env['ZEPHYR_16_SDK_INSTALL_DIR'];
      break;
    default:
      throw new Error(`no suitable zephyr-sdk for this operation.`);
  }

  const isUpdate = env["ZEPHYR_BASE"] && argv[0] === "update";
  Lisa.application.debug(env["ZEPHYR_BASE"]);
  try {
    const res = await cmd(
      await venvScripts("west"),
      [...argv],
      Object.assign(
        {
          // stdio: ["inherit", "inherit", "pipe"],
          stdio: "inherit",
          env,
          cwd: isUpdate ? join(env["ZEPHYR_BASE"], '..') : process.cwd()
        },
        options
      )
    );
    Lisa.application.debug(res);
  } catch (error: any) {
    // console.log("\x1B[31m%s\x1B[0m", error.stderr);
    await Sentry.captureMessage(error);
    await Sentry.close(2000);
    process.exit(error.exitCode);
  }
  return true;
}

function redChar(char: string) {
  return `\x1b[31m${char}\x1B[0m`;
}