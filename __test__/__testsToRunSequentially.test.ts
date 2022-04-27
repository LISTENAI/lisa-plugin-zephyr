import { remove } from "fs-extra";
import {
  testEnvironment,
  testClearEnvironment,
  testIinitVs,
  testPorject,
  testWest,
  testInstallation,
} from "./task/index";
//
// import { TEST_DIR } from "./utils";
beforeAll(async () => {});
afterAll(async () => {
  // await remove(TEST_DIR);
});
describe("sequentially run tests", () => {
  testEnvironment();
  testPorject();
  testIinitVs();
  testWest();
  testInstallation();
  testClearEnvironment();
});
