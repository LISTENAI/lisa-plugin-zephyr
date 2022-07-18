import { resolve } from "path";
import lisa from "@listenai/lisa_core";
const { cmd } = lisa;
// const concat = require("concat-stream");
import { pathExists } from "fs-extra";

const TEST_DIR = resolve("__testTarget__");
const TEST_SDK_DIR = resolve(TEST_DIR, "my-zephyr-sdk");
const DOWN = "\x1B\x5B\x42";
const UP = "\x1B\x5B\x41";
const ENTER = "\x0D";
const SPACE = "\x20";
const testCmd = async (file: any, args: any, options?: any) => {
  if (await pathExists(TEST_SDK_DIR)) {
    options = options ? options : { cwd: TEST_SDK_DIR };
  }
  return cmd(file, args, options);
};

/**
 * @param {string[]} args CLI args to pass in
 * @param {string[]} answers answers to be passed to stdout
 * @param {Object} [options] specify the testPath and timeout
 *
 * returns {Promise<Object>}
 */

// const promptsTestCmd = (file: any, args: any, options: any, answers: any) => {
//   // Defaults to process.cwd()
//   options.cwd = TEST_SDK_DIR;
//   console.log("promptsTestCmd--->", answers);
//   // Timeout between each keystroke simulation
//   const timeout = options && options.timeout ? options.timeout : 500;

//   const runner: any = cmd(file, args, options);
//   runner.stdin.setDefaultEncoding("utf-8");

//   const writeToStdin = (answers: any) => {
//     if (answers.length > 0) {
//       setTimeout(() => {
//         console.log(111, answers[0].toString());
//         runner.stdin.write(answers[0]);
//         writeToStdin(answers.slice(1));
//       }, timeout);
//     } else {
//       runner.stdin.end();
//     }
//   };

//   // Simulate user input (keystrokes)
//   writeToStdin(answers);

//   return new Promise((resolve) => {
//     const obj: any = { stdout: "", stderr: "" };

//     runner.stdout.pipe(
//       concat((result: any) => {
//         console.log(result);
//         obj.stdout = result.toString();
//       })
//     );

//     runner.stderr.pipe(
//       concat((result: any) => {
//         obj.stderr = result.toString();
//       })
//     );

//     runner.on("exit", (exitCode: number) => {
//       obj.exitCode = exitCode;
//       resolve(obj);
//     });
//   });
// };

export {
  TEST_DIR,
  TEST_SDK_DIR,
  testCmd,
  // promptsTestCmd,
  DOWN,
  ENTER,
  UP,
  SPACE,
};
