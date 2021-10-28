LISA 沙盒机制设计
==========

## 概述

为了简化用户建立开发环境的步骤，并减少对用户本机环境的依赖，我们在 LISA 中设计了一套沙盒机制。LISA 所用到工具将由 LPM 托管并安装到 LISA 自身目录中，由 LISA 管理安装和更新，不污染全局环境。

## 定义

沙盒系统由两个概念构成：Binary 和 Bundle。它们本质上是一些包含 TypeScript 定义的 NPM 包，托管在 LPM 的 `@binary` scope 下。

### Binary

Binary 包是沙盒系统的最小单位，是二进制工具的容器。一个 Binary 包的对外接口由 [@binary/type](https://github.com/LISTENAI/binary-type) 定义。它包含如下字段：

```ts
interface Binary {
  // 根目录的绝对路径 (可理解为 ${prefix})
  homeDir: string;

  // 可执行文件目录的绝对路径 (可理解为 ${prefix}/bin)
  binaryDir: string;

  // 对外暴露的环境变量
  env: Record<string, string>;

  // 获取可执行文件版本
  version(): Promise<string>;
}
```

参考 [@binary/cmake](https://github.com/LISTENAI/binary-cmake)，一个 Binary 包应该由如下要素构成：

* 导出符合如上接口定义的对象
* 通过 npm install 钩子下载解压当前平台的二进制文件
* 仓库包含 Windows/Linux/macOS 三个平台的单元测试，单元测试中应该调用 `version()` 接口以判断二进制是否正确执行

### Bundle

Bundle 是一系列 Binary 的集合，由 `lisa zep use-env` 安装。Bundle 自身不提供二进制，而是依赖一系列 Binary 包。Bundle 还可以对外导出环境变量。一个 Bundle 包的对外接口由 [@binary/bundle](https://github.com/LISTENAI/binary-bundle) 定义。它包含如下字段：

```ts
interface Bundle {
  // 所包含的 Binary 列表
  binaries: string[];

  // 对外暴露的环境变量
  env: Record<string, string>;
}
```

一个 Bundle 包由如下要素构成：

* 导出符合如上接口定义的对象
* 所包含的 Binary 应该作为本 Bundle 的 `dependencies` 写到 `package.json` 中

## 实现

LISA Zephyr 的沙盒环境构成如下：

* 插件自身所需的 Binary，如 `@binary/cmake` 和 `@binary/ninja` 等
* 用户依据构建目标所选的 Bundle 所包含的 Binary

LISA Zephyr 执行一个命令调用时，会组装一些环境变量：

* 每一个 Binary 的 `binaryDir` 拼接后附加在系统 `PATH` 之前
* 每一个 Binary 的 `env` 所定义的环境变量
* Bundle 的 `env` 所定义的环境变量
