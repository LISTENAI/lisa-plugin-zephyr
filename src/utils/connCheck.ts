import got, { Response } from 'got';

interface ConnCheckRawResult {
  url: string;
  ok: boolean;
}

export async function connCheck(task?: any): Promise<void> {
  // set proxy?
  if (task) {
    task.title = "正在检查网络状况...";
  }

  const urlBase: Record<string, string> = {
    "https://cdn.iflyos.cn/public/cskTools/conntest.txt": "聆思资源服务",
    "https://pypi.tuna.tsinghua.edu.cn/simple/numpy": "PyPI 软件仓库（TUNA 镜像站）",
    "https://registry.npmmirror.com": "NPMMirror 镜像站"
  };

  const urls = Object.keys(urlBase);
  const checkResult = await parallelHttpsCheck(urls);
  const failedUrls = checkResult.filter(result => !result.ok);
  if (failedUrls.length > 0) {
    const failedItems = failedUrls.map(result => urlBase[result.url]).join(', ');
    throw new Error(`资源访问失败，请检查网络连接是否正常。item = ${failedItems}`);
  }
}

async function parallelHttpsCheck(urls: string[]): Promise<ConnCheckRawResult[]> {
  const results = await Promise.allSettled(
    urls.map(url =>
      got(url, {
        timeout: 3000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (LISA zephyr plugin/2.1.0)'
        },
        throwHttpErrors: true
      }).then((response: Response) => {
        const status = response.statusCode;
        return {
          url,
          ok: (status >= 200 && status < 310) || status === 401,
        };
      }).catch(() => ({
        url,
        ok: false
      }))
    )
  );

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      url: urls[results.indexOf(result)],
      ok: false,
    };
  });
}