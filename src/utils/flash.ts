import LISA from '@listenai/lisa_core';
import { sortBy } from 'lodash';
import { stat, writeFile } from 'fs-extra';
import { IImage } from '@tool/lpk/lib/manifest';
import { getEnv } from '../env';
import { join } from 'path';
import * as iconv from 'iconv-lite';
import {homedir, platform, tmpdir} from 'os';

interface Context {
  flash: FlashConfig[];
}

interface FlashConfig {
  tag: string;
  addr: number;
  file: string;
}

function getContext(ctx: any): Context {
  ctx.flash = ctx.flash || [];
  return ctx as Context;
}

export function appendFlashConfig(ctx: any, tag: string, addr: number, file: string): void {
  const { flash } = getContext(ctx);
  flash.push({ tag, addr, file });
}

export async function getFlashArgs(ctx: any, tag?: string): Promise<Record<number, string>> {
  const flash = sortBy(getContext(ctx).flash, ['addr']);
  LISA.application.debug({ flash });

  const flashArgs: Record<number, string> = {};
  let last: FlashConfig & { size: number } | undefined;
  for (const cfg of flash) {
    if (tag && cfg.tag != tag) continue;

    if (last && cfg.addr < last.addr + last.size) {
      const myAddr = toHex(cfg.addr);
      const lastRange = `${toHex(last.addr)}-${toHex(last.addr + last.size)}`;
      throw new Error(`${cfg.tag} 分区 (${myAddr}) 与 ${last.tag} 分区 (${lastRange}) 重叠`);
    }

    const s = await stat(cfg.file);
    last = { ...cfg, size: s.size };

    flashArgs[cfg.addr] = cfg.file;
  }

  return flashArgs;
}

export function toHex(addr: number): string {
  return `0x${addr.toString(16).padStart(8, '0')}`;
}


export interface IFlashOpts {
  p?: string;
  b?: number;
  f?: number;
  speed?: number;
  device?: string;
}

export async function flashRun(images: IImage[], runner: string, opts?: IFlashOpts): Promise<void> {
  let flashCmd = '', flashArgs = '';
  
  switch(runner) {
    case 'csk':
      // cskburn -s /dev/tty.usbmodem141202 -C 6 0x0 ./build/zephyr/zephyr.bin -b 748800
      if (!opts?.p) {
        throw new Error('串口烧录需要使用 --port 或 -p 参数指定端口号')
      }
      flashArgs = images.map(image => {
        return `${image.addr} ${image.file}`
      }).join(' ')
      flashCmd = `cskburn -s ${opts?.p} -C 6 ${flashArgs} -b ${opts?.b || 748800}`
      await cmdRun(flashCmd)
      break;
    case 'pyocd':
      // pyocd flash -e sector -t csk6001 ./images/zephyr.bin@0x18000000 ./images/cp.bin@0x18100000 --frequency=30000000
      flashArgs = images.map(image => {
        return `${image.file}@0x18${(parseInt(image.addr, 16)).toString(16).padStart(6, '0')}`
      }).join(' ')
      flashCmd = `pyocd flash -e sector -t csk6001 ${flashArgs} --frequency=${opts?.f || 30000000}`
      await cmdRun(flashCmd)
      break;
    case 'jlink':
      const tmpfile = join(tmpdir(), 'runner.jlink')
      const CommanderScript = [];
      CommanderScript.push('r')
      // CommanderScript.push('erase')
      images.forEach(image => {
        CommanderScript.push(`loadbin ${image.file} 0x18${(parseInt(image.addr, 16)).toString(16).padStart(6, '0')}`)
      })
      CommanderScript.push('q')

      console.log(CommanderScript)

      
      const jlinkArgs = [];
      if (platform() === 'win32') {
        jlinkArgs.push('JLink.exe');
        await writeFile(join(tmpdir(), 'runner.jlink'), iconv.encode(CommanderScript.join('\n'), 'gbk'));
      } else {
        jlinkArgs.push(`${homedir()}/.listenai/lisa-zephyr/packages/node_modules/@binary/jlink-venus/binary/JLinkExe`);
        await writeFile(join(tmpdir(), 'runner.jlink'), CommanderScript.join('\n'));
      }
      jlinkArgs.push('-nogui', '1');
      jlinkArgs.push('-if', 'swd');
      jlinkArgs.push('-speed', opts?.speed ?? 'auto');
      jlinkArgs.push('-device', opts?.device ?? 'Venus');
      jlinkArgs.push('-CommanderScript', tmpfile);
      jlinkArgs.push('-nogui', '1');
      flashCmd = jlinkArgs.join(' ')
      await cmdRun(flashCmd)
      break;
    default:
      throw new Error(`不支持的runner: ${runner}`);
  }
}

async function cmdRun(cmd: string) {
  const cmdArgs = cmd.split(' ')
  try {
    await LISA.cmd(cmdArgs.shift() || '', cmdArgs, {
      stdio: "inherit",
      env: await getEnv(),
    });
  } catch (error) {
    throw new Error(`Command failed : ${cmd}, Error = ${error}`)
  }
}
