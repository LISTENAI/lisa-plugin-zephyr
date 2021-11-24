import LISA from '@listenai/lisa_core';
import { sortBy } from 'lodash';
import { stat } from 'fs-extra';

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

function toHex(addr: number): string {
  return `0x${addr.toString(16).padStart(8, '0')}`;
}
