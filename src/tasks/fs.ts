import { LisaType, job } from "../utils/lisa_ex";
import { join, resolve } from "path";
import { pathExists, mkdirs, remove, readJson, writeJson } from "fs-extra";

import { getEnv, getFlasher } from "../env";

import parseArgs from "../utils/parseArgs";
import extendExec from "../utils/extendExec";
import { workspace } from "../utils/ux";
import { loadDT } from "../utils/dt";
import {
  parsePartitions,
  checkFsFilter,
  IFsFilter,
  IPartition,
} from "../utils/fs";
import { appendFlashConfig, getFlashArgs } from "../utils/flash";
import { getCMakeCache } from "../utils/cmake";
import { venvScripts } from "../venv";
import { flashFlags } from "../utils/westConfig";

export default ({ application, cmd }: LisaType) => {
  job("fs", {
    title: "文件系统操作",
    // before: (ctx) => [
    //   application.tasks['build'],
    // ],
    async task(ctx, task) {
      const fsOpts = [
        {
          name: "资源结构初始化",
          command: "fs:init",
        },
        {
          name: "资源镜像固定资源检查",
          desc: "",
          command: "fs:check",
        },
        {
          name: "资源镜像构建",
          command: "fs:build",
        },
        {
          name: "资源镜像烧录",
          command: "fs:flash",
        },
        {
          name: "资源镜像清理",
          command: "fs:clean",
        },
      ];
      const option = await task.prompt({
        type: "select",
        name: "value",
        message: "请选择操作",
        choices: fsOpts.map((item: any) => item.name),
      });
      const opt: any = fsOpts.find((item) => item.name === option);
      await cmd("lisa", ["zep", opt.command], { stdio: 'inherit' });

    },
  });
  job("fs:init", {
    title: "资源结构初始化",
    // before: (ctx) => [
    //   application.tasks['build'],
    // ],
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        "build-dir": { short: "d", arg: "path", help: "构建产物目录" },
        "task-help": { short: "h", help: "打印帮助" },
      });
      if (args["task-help"]) {
        return printHelp(["fs:init [options] [project-path]"]);
      }

      const buildDir = resolve(args["build-dir"] ?? "build");

      const project =
        (await getCMakeCache(buildDir, "APPLICATION_SOURCE_DIR", "PATH")) || "";
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
      }

      const dt = await loadDT(buildDir, await getEnv());
      const partitions = parsePartitions(dt);
      application.debug({ partitions });
      if (!partitions.length) {
        throw new Error(`该项目 ${project} 没有声明 fixed-partitions`);
      }

      const resourceDir = join(project, "resource");

      // 初始化目录
      await mkdirs(resourceDir);

      // 创建文件夹结构
      for (const part of partitions) {
        await mkdirs(join(resourceDir, part.label));
      }
      task.title = `资源分区结构初始化成功: ${resourceDir}`;
    },
  });

  job("fs:check", {
    title: "资源镜像固定资源检查",
    async task(ctx, task) {
      const { args } = parseArgs(application.argv, {
        "build-dir": { short: "d", arg: "path", help: "构建产物目录" },
      });

      const buildDir = resolve(args["build-dir"] ?? "build");

      const project =
        (await getCMakeCache(buildDir, "APPLICATION_SOURCE_DIR", "PATH")) || "";
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
      }

      const dt = await loadDT(buildDir, await getEnv());
      const partitions = parsePartitions(dt);
      ctx.partitions = partitions;
      application.debug({ partitions });
      if (!partitions.length) {
        return task.skip("当前无文件系统分区");
      }

      const fsFilterFile = join(project, "fs_filter.json");
      if (!(await pathExists(fsFilterFile))) {
        return task.skip("当前无需要检查的固定资源");
      }

      let fsFilter: IFsFilter = {};
      try {
        fsFilter = await readJson(fsFilterFile);
      } catch (error) {
        return task.skip("fs_filter.json文件损坏");
      }

      const resourceDir = join(project, "resource");
      for (const part of partitions) {
        if (part.type == "littlefs") {
          await mkdirs(join(resourceDir, part.label));
          await checkFsFilter(part.label, fsFilter, resourceDir);
        }
      }
    },
  });

  job("fs:build", {
    title: "资源镜像构建",
    before: (ctx) => [application.tasks["fs:check"]],
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        "build-dir": { short: "d", arg: "path", help: "构建产物目录" },
        "task-help": { short: "h", help: "打印帮助" },
        pristine: { short: "p", help: "重新构建，不依赖原打包路径" },
        "node-label": { arg: "label", help: "指定打包的分区节点" },
        type: { arg: "type", help: "指定打包的文件系统类型" },
      });
      if (args["task-help"]) {
        return printHelp(["fs:build [options] [project-path]"]);
      }

      const nodeLabel = args["node-label"];
      const fsSourceDir = workspace();
      const custom = !!nodeLabel && !!fsSourceDir;
      if (!(custom || (!fsSourceDir && !nodeLabel))) {
        throw new Error(
          `需要同时指定打包目标目录和分区节点，详情请查看开发文档的文件系统章节`
        );
      }

      const pristine = !!args["pristine"];
      const buildDir = resolve(args["build-dir"] ?? "build");

      const project =
        (await getCMakeCache(buildDir, "APPLICATION_SOURCE_DIR", "PATH")) || "";
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
      }

      const partitions = ctx.partitions || [];
      application.debug({ partitions });
      if (!partitions.length) {
        return;
      }

      const resourceDir = join(project, "resource");
      const resourceBuildDir = join(buildDir, "resource");
      const resourceBuildCacheFile = join(resourceBuildDir, "fsCache.json");
      await mkdirs(resourceBuildDir);

      const exec = extendExec(cmd, { task, env: await getEnv() });

      // 获取原有的文件系统打包缓存信息
      let fsCache: IPartition[] = [];
      if (await pathExists(resourceBuildCacheFile)) {
        try {
          fsCache = await readJson(resourceBuildCacheFile);
        } catch (error) {
          throw new Error(
            `${resourceBuildCacheFile} 缓存文件已损坏，请执行命令时带上 -p 参数`
          );
        }
      }
      if (pristine) fsCache = [];

      let newFsCache: IPartition[] = [];

      if (custom) {
        if (!(await pathExists(fsSourceDir))) {
          throw new Error(`不存在该文件夹： ${fsSourceDir}`);
        }
        const part = partitions.find(
          (partition: IPartition) => partition.label === nodeLabel
        );
        if (!part) {
          throw new Error(`当前固件没有 ${nodeLabel} 该node-label的分区`);
        }
        if (part.type == "littlefs") {
          const partFile = join(resourceBuildDir, `${part.label}.bin`);
          await exec("mklfs", [".", partFile, `${part.size}`], {
            cwd: fsSourceDir,
          });
          part.source = fsSourceDir;
          newFsCache = newFsCache
            .concat(
              fsCache.filter(
                (partition: IPartition) => partition.label !== nodeLabel
              )
            )
            .concat([part]);
        }
      } else {
        for (const part of partitions) {
          if (part.type == "littlefs") {
            let partSourceDir = join(resourceDir, part.label);

            const fsCachePart: IPartition | undefined = fsCache.find(
              (item: IPartition) => {
                return (
                  item.label === part.label &&
                  item.addr === part.addr &&
                  item.size === part.size &&
                  item.type === part.type
                );
              }
            );
            if (fsCachePart) {
              if (
                fsCachePart.source &&
                !(await pathExists(fsCachePart.source))
              ) {
                throw new Error(
                  `node-label: ${part.label} 的缓存文件夹来源: ${fsCachePart.source} 不存在，更多用法请查看开发文档文件系统相关章节`
                );
              }
              partSourceDir = fsCachePart.source || partSourceDir;
            }

            await mkdirs(partSourceDir);
            const partFile = join(resourceBuildDir, `${part.label}.bin`);
            await exec("mklfs", [".", partFile, `${part.size}`], {
              cwd: partSourceDir,
            });

            part.source = partSourceDir;
            newFsCache.push(part);
            appendFlashConfig(ctx, "fs", part.addr, partFile);
          }
        }
      }
      await writeJson(join(resourceBuildDir, "fsCache.json"), newFsCache);
    },
  });

  job("fs:flash", {
    title: "资源镜像烧录",
    before: (ctx) => [application.tasks["fs:build"]],
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        env: { arg: "name", help: "指定当次编译有效的环境" },
        "task-help": { short: "h", help: "打印帮助" },
        runner: { arg: "string", help: "指定当次的烧录类型" },
        port: { arg: "string", help: "指定当次烧录的串口号" },
        baud: { arg: "string", help: "指定当次烧录的波特率" },
        // 'node-label': { arg: 'label', help: '指定烧录的分区节点'},
      });
      if (args["task-help"]) {
        return printHelp();
      }
      const runner = args["runner"] || null;
      // const nodeLabel = args['node-label'];

      const exec = extendExec(cmd, { task, env: await getEnv(args["env"]) });
      const flashArgs = await getFlashArgs(ctx, "fs");
      if (Object.keys(flashArgs).length == 0) {
        return;
      }

      application.debug(flashArgs);

      // if (runner) {
      // lisa zep flash --runner pyocd --flash-opt="--base-address=xxxx" --bin-file xxxx.bin
      const VENUS_FLASH_BASE = 0x18000000;
      for (let address in flashArgs) {
        if (runner === "csk") {
          await exec("cskburn", [
            "--chip",
            "6",
            "--serial",
            `${args["port"]}`,
            `--baud`,
            `${args["baud"] || 748800}`,
            `--reset-nanokit`,
            `0x${parseInt(address).toString(16)}`,
            flashArgs[address],
          ]);
        } else {
          await exec(
            await venvScripts("west"),
            await flashFlags([
              "flash",
              `--flash-opt=--base-address=0x${(
                VENUS_FLASH_BASE + parseInt(address)
              ).toString(16)}`,
              "--bin-file",
              flashArgs[address],
            ])
          );
        }
      }
      // } else {
      //   const flasher = await getFlasher(args['env']);
      //   if (flasher) {
      //     const { command, args: execArgs } = flasher.makeFlashExecArgs(flashArgs);
      //     await exec(command, execArgs);
      //   } else {
      //     throw new Error('当前环境不支持烧录资源镜像');
      //   }
      // }
    },
  });

  job("fs:clean", {
    title: "资源镜像清理",
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        "build-dir": { short: "d", arg: "path", help: "构建产物目录" },
        "task-help": { short: "h", help: "打印帮助" },
      });
      if (args["task-help"]) {
        return printHelp();
      }

      const buildDir = resolve(args["build-dir"] ?? "build");
      await remove(join(buildDir, "resource"));
    },
  });
};
