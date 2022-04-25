const concat = require("concat-stream");
import lisa from "@listenai/lisa_core";

const { cmd } = lisa;
// Key codes
const keys = {
  up: "\x1B\x5B\x41",
  down: "\x1B\x5B\x42",
  enter: "\x0D",
  space: "\x20",
};
// Mock stdin so we can send messages to the CLI
test("prompt for input", async () => {
  // const { stdout } = await cmd("lisa", ["zep", "create"], {
  //   input: `${keys.enter}\n${keys.enter}\n${keys.enter}`,
  // });
  const runner: any = cmd("lisa", ["zep", "create"]);
  runner.stdin.write(`${keys.enter}\n`);
  runner.stdin.write(`${keys.enter}\n`);
  setTimeout(() => runner.stdin.write(`${keys.enter}\n`), 1000);
  setTimeout(() => runner.stdin.end(), 2000);

  runner.stdout.pipe(
    concat((result: any) => {
      expect(result.toString()).toEqual("成功");
      return result;
    })
  );

  // console.log(runner.stdout);
  // expect(result).toEqual({ shoe: "Rubber Boots" });
});
