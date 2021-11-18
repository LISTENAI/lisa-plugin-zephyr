import LISA from '@listenai/lisa_core';
import { once } from 'events';
import { ParsedArgs } from 'minimist';
import * as SerialPort from 'serialport';

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
  if (dataBits == 8 || dataBits == 7 || dataBits == 6 || dataBits == 5) return dataBits;
}

function parseStopBits(input: string): 1 | 2 | undefined {
  const stopBits = parseInt(input);
  if (stopBits == 1 || stopBits == 2) return stopBits;
}

export default ({ job, application }: typeof LISA) => {

  job('term', {
    async task(ctx, task) {
      const argv = application.argv as ParsedArgs;

      if (argv['l'] || argv['list']) {
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

      const path = argv['p'] || argv['path'] || await askForPort();
      const options: SerialPort.OpenOptions = {
        baudRate: parseInt(argv['b'] || argv['baud']) || 115200,
        dataBits: parseDataBits(argv['databits']) || 8,
        parity: argv['parity'] || 'none',
        stopBits: parseStopBits(argv['stopbits']) || 1,
      };

      const port = new SerialPort(path, options);

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
