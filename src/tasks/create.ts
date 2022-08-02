import { LisaType, job } from "../utils/lisa_ex";
import { get } from "../env/config";
import { join, parse, resolve, sep, basename, extname } from "path";
import { pathExists, createReadStream, copy, mkdirs } from "fs-extra";
import { createInterface } from "readline";
import { once } from "events";
import * as glob from "glob";
import { ISampleList, path2json } from "../utils/fs";
import { promptDir } from "../utils/ux";
import { testLog } from "../utils/testLog";
import { ParsedArgs } from "minimist";
import parseArgs from "../utils/parseArgs";
import AppProject from "../models/appProject";
import * as inquirer from 'inquirer';
const inquirerFileTreeSelection = require('inquirer-file-tree-selection-prompt');
inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection)

export default ({ application, cmd }: LisaType) => {
  job("create", {
    title: "创建 sample",
    async task(ctx, task) {
      task.title = "";
      const argv = application.argv as ParsedArgs;
      const { args, printHelp } = parseArgs(application.argv, {
        // "task-help": { short: "h", help: "打印帮助" },
        "from-git": { arg: "url", help: "从指定仓库及分支初始化 SDK" },
      });

      if (args["from-git"]) {
        task.title = "";
        const fromGit = args["from-git"];
        const targetDir = join(
          process.cwd(),
          await task.prompt({
            type: "Input",
            message: "创建文件夹名",
            initial: basename(fromGit, extname(fromGit)),
          })
        );

        try {
          await cmd('git', ['clone', fromGit, targetDir], {
            stdio: 'inherit',
          })  
        } catch (error: any) {
          process.exit(error.exitCode);
          // console.log(error)
        }
        
        const app = new AppProject(targetDir);
        await app.init();

        task.title = "创建成功";
        return
      }


      const sdk = (await get("sdk")) || "";
      // 查看含有 sample.list 的 board
      const samplePathGlob = join(sdk, "samples", "boards", "*", "sample.list");
      const sampleFiles = glob.sync(samplePathGlob, {});
      const boardsSampleList: ISampleList = {};
      for (const file of sampleFiles) {
        const board = resolve(parse(file).dir).split(sep).pop() ;
        if (board) {
          boardsSampleList[board] = file;
        }
      }

      // 选择 board (当board仅一个时，跳过选择)
      const boards = Object.keys(boardsSampleList);
      if (boards.length === 0) {
        throw new Error("当前 SDK 暂不支持 create 项目");
      }

      let board = boards[0];
      if (Object.keys(boardsSampleList).length > 1) {
        board = await task.prompt<string>([
          {
            type: "Select",
            name: "value",
            message:
              "Please select a board. (Arrow keys to select and enter key to confirm.)",
            choices: Object.keys(boardsSampleList),
            result: (value) => value.replace("/", ""),
          },
        ]);
      }

      // Feature: sample.list的位置获取方式
      const sampleListFile = resolve(boardsSampleList[board] as string);
      application.debug(sampleListFile);
      if (!(await pathExists(sampleListFile))) {
        throw new Error(`当前 SDK 的 ${board} 暂不支持 create 项目`);
      }

      // 解析sampleListFile 按文件夹的json结构
      let sampleList: string[] = [];
      const rl = createInterface({
        input: createReadStream(sampleListFile),
      });
      rl.on("line", async (line) => {
        line = line.trim();
        if (line && !line.startsWith("#")) {
          line = !line.endsWith("*")
            ? resolve(sdk, line, "./**/CMakeLists.txt")
            : resolve(sdk, `${line}*`, "./CMakeLists.txt");
          sampleList.push(resolve(line));
        }
      });

      await once(rl, "close");

      let sampleListJson: ISampleList = {};
      // console.log(sampleList)
      for (const samplePath of sampleList) {
        const files = glob.sync(samplePath, {});
        for (const file of files) {
          const dirParse = resolve(parse(file).dir)
            .replace(join(sdk, "samples"), "")
            .split(sep);
          // console.log(dirParse);
          sampleListJson = await path2json(dirParse, sampleListJson);
        }
      }

      // 根据sampleListJson ux.select 嵌套
      application.debug(sampleListJson);

      const answers = await inquirer.prompt([
        {
          type: 'file-tree-selection',
          name: 'file',
          root: join(sdk, 'samples'),
          onlyShowValid: true,
          validate: (item) => {
            const dirParse = resolve(item).replace(join(sdk, "samples"), "").split(sep);
            let val = false;
            let startJson = JSON.parse(JSON.stringify(sampleListJson))
            while(dirParse.length) {
              const term = dirParse.shift();
              if (term && startJson[term]) {
                startJson = startJson[term]
                val = true
              } else {
                val = false
              }
            }
            return val;
          },
          transformer: (item) => {
            const dirParse = resolve(item).replace(join(sdk, "samples"), "").split(sep);
            let name = item.split(sep).pop();
            let startJson = JSON.parse(JSON.stringify(sampleListJson))
            while(dirParse.length) {
              const term = dirParse.shift();
              if (term && startJson[term]) {
                startJson = startJson[term]
                if (typeof startJson === 'string') {
                  name = `[${name}]`
                }
              }
            }
            return name;
          },
        }
      ])
      const selected = resolve(answers.file);


      const dirParse = selected.replace(join(sdk, "samples"), "").split(sep);
      let val = false;
      let startJson = JSON.parse(JSON.stringify(sampleListJson))
      while(dirParse.length) {
        const term = dirParse.shift();
        if (term && startJson[term]) {
          startJson = startJson[term]
          val = typeof startJson === 'string' ? true : false
        } else {
          val = false
        }
      }
     
      if (!val) {
        throw new Error('请选择选项为[xx]的项目sample，例如: [hello_world]')
      }

      // const selected = await promptDir([], sampleListJson, task);
      // const selectedSample = join(sdk, "samples", ...selected);

      const targetDir = join(
        process.cwd(),
        await task.prompt({
          type: "Input",
          message: "创建文件夹名",
          initial: selected.split(sep).pop() as string,
        })
      );

      await mkdirs(targetDir);
      await copy(selected, targetDir);
      await cmd('lisa', ['zep', 'ide'], {
        cwd: targetDir
      })  
      task.title = '创建sample成功';
      testLog(task, "创建sample成功");
    },
  });
};
