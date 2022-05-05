
export function testLog(tsak: any, res: string) {
  const TEST = process.env.NODE_ENV === 'test'
  if (TEST) {
    tsak.title = "";
    console.log('testlog:---->', res);
  }
}
