import LISA from '@listenai/lisa_core';
import { once } from 'events';
import * as SerialPort from 'serialport';

import { ParseArgOptions, parseArgs, printHelp } from '../utils/parseArgs';

const PORT_BLACKLIST = [
  '/dev/tty.BLTH',
  '/dev/tty.Bluetooth-Incoming-Port',
];

async function getFilteredPorts(): Promise<SerialPort.PortInfo[]> {
  const ports = await SerialPort.list();
  return ports.filter(port => !PORT_BLACKLIST.includes(port.path));
}

function parseDataBits(input: string): 8 | 7 | 6 | 5 | undefined {
  const dataBits = parseInt(input);
  if (dataBits == 8) return dataBits;
  if (dataBits == 7) return dataBits;
  if (dataBits == 6) return dataBits;
  if (dataBits == 5) return dataBits;
}

function parseParity(input: string): 'none' | 'even' | 'mark' | 'odd' | 'space' | undefined {
  if (input == 'none') return input;
  if (input == 'even') return input;
  if (input == 'mark') return input;
  if (input == 'odd') return input;
  if (input == 'space') return input;
}

function parseStopBits(input: string): 1 | 2 | undefined {
  const stopBits = parseInt(input);
  if (stopBits == 1) return stopBits;
  if (stopBits == 2) return stopBits;
}

export default ({ job, application }: typeof LISA) => {

  job('term', {
    title: '终端模拟器',
    async task(ctx, task) {
      task.title = '';

      const options: ParseArgOptions = {
        'list': { short: 'l', help: '列出本机所有串口路径' },
        'path': { short: 'p', arg: 'path', help: '指定串口路径' },
        'baud': { short: 'b', arg: 'rate', help: '波特率 (默认: 115200)' },
        'databits': { arg: 'bits', help: '数据位 (默认: 8)' },
        'parity': { arg: 'parity', help: '校验位 (默认: none)' },
        'stopbits': { arg: 'bits', help: '停止位 (默认: 1)' },
        'task-help': { short: 'h', help: '打印帮助' },
      };

      const args = parseArgs(application.argv, options);
      if (args['task-help']) {
        return printHelp(options);
      }

      if (args['list']) {
        for (const port of await getFilteredPorts()) {
          console.log(`${port.path}\t${port.pnpId || ''}\t${port.manufacturer || ''}`);
        }
        return;
      }

      async function askForPort(): Promise<string> {
        const ports = await getFilteredPorts();
        if (ports.length == 0) {
          throw new Error('未找到任何串口设备，请尝试使用 -p [path] 手动指定');
        }
        return await task.prompt<string>([{
          type: 'Select',
          name: 'serial-port',
          message: '选择一个串口',
          choices: ports.map(port => port.path),
          required: true,
        }]);
      }

      const path = args['path'] || await askForPort();
      const port = new SerialPort(path, {
        baudRate: parseInt(args['baud'] ?? '') || 115200,
        dataBits: parseDataBits(args['databits'] ?? '') || 8,
        parity: parseParity(args['parity'] ?? '') || 'none',
        stopBits: parseStopBits(args['stopbits'] ?? '') || 1,
      });

      port.pipe(process.stdout);

      process.stdin.setRawMode(true);
      process.stdin.on('data', (input) => {
        for (const char of input) {
          if (char == 0x03) {
            port.close();
            return;
          }
          port.write(input);
        }
      });
      process.stdin.once('end', () => port.close());
      process.stdin.resume();

      await once(port, 'close');
    },
  });

}
