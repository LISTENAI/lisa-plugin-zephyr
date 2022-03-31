import LISA from '@listenai/lisa_core';
import { resolve } from 'path';

export interface IDeviceTreeParser {
  choose(name: string): Node | null;
  label(label: string): Node | null;
  node(path: NodePath): Node | null;
  labelNameByPath(path: NodePath): string | null;
  under(parent: NodePath): Node[];
}

export type NodePath = string;

export interface DeviceTree {
  readonly chosens: Record<string, NodePath>;
  readonly labels: Record<string, NodePath>;
  readonly nodes: Record<NodePath, Node>;
}

export type Property = boolean | string | number | string[] | number[] | NodePath | Controller[];

export interface Node {
  path: string;
  compatible?: string[];
  label?: string;
  reg?: Register[];
  status?: 'okay' | 'disabled';
  interrupts?: number[];
  properties: Record<string, Property>;
}

export interface Register {
  addr?: number;
  size?: number;
}

export interface Controller {
  controller: NodePath;
  name?: string;
  data: Record<string, any>;
}

export async function loadDT(buildDir: string, env: Record<string, string>): Promise<DeviceTree & IDeviceTreeParser> {
  // console.log('python', [
  //   resolve(__dirname, '..', '..', 'scripts', 'edt2json.py'),
  //   '--dtlib', resolve(env.ZEPHYR_BASE, 'scripts', 'dts', 'python-devicetree', 'src'),
  //   '--edt-pickle', resolve(buildDir, 'zephyr', 'edt.pickle'),
  // ].join(' '))
  const { stdout } = await LISA.cmd('python', [
    resolve(__dirname, '..', '..', 'scripts', 'edt2json.py'),
    '--dtlib', resolve(env.ZEPHYR_BASE, 'scripts', 'dts', 'python-devicetree', 'src'),
    '--edt-pickle', resolve(buildDir, 'zephyr', 'edt.pickle'),
  ], { env });

  const dt = JSON.parse(stdout) as DeviceTree;
  return new DeviceTreeParser(dt);
}

export default class DeviceTreeParser implements IDeviceTreeParser, DeviceTree {
  readonly chosens: Record<string, NodePath> = {};
  readonly labels: Record<string, NodePath> = {};
  readonly nodes: Record<NodePath, Node> = {};

  constructor(dt: DeviceTree) {
    Object.assign(this, dt);
  }

  choose(name: string): Node | null {
    const path = this.chosens[name];
    if (!path) return null;
    return this.nodes[path] || null;
  }

  label(label: string): Node | null {
    const path = this.labels[label];
    if (!path) return null;
    return this.nodes[path] || null;
  }

  node(path: NodePath): Node | null {
    return this.nodes[path] || null;
  }

  labelNameByPath(path: NodePath): string | null {
    return Object.keys(this.labels).find(labelName => this.labels[labelName] === path) || null;
  }

  under(parent: NodePath): Node[] {
    return Object.keys(this.nodes)
      .filter(path => isChild(parent, path))
      .map(path => this.nodes[path])
      .filter(node => !!node);
  }
}

function isChild(parent: NodePath, path: NodePath): boolean {
  return path.startsWith(`${parent}/`) &&
    !path.substr(parent.length + 1).includes('/');
}
