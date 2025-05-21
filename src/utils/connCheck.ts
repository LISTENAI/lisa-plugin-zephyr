import got, { Response } from 'got';

interface ConnCheckRawResult {
  url: string;
  ok: boolean;
}

export async function connCheck(): Promise<void> {
  // set proxy?
  console.log('正在检查网络状况...');

  const urlBase: Record<string, string> = {
    "https://cloud.listenai.com": "LSCloud",
    "https://registry-lpm.listenai.com": "LPM",
    "https://cdn.iflyos.cn/public/cskTools/conntest.txt": "聆思资源服务",
    "https://pypi.tuna.tsinghua.edu.cn/simple": "PyPI 软件仓库（TUNA 镜像站）",
    "https://registry.npmmirror.com": "NPMMirror 镜像站"
  };

  const urls = Object.keys(urlBase);
  const checkResult = await parallelHttpsCheck(urls);
  const failedUrls = checkResult.filter(result => !result.ok);
  if (failedUrls.length > 0) {
    const failedItems = failedUrls.map(result => urlBase[result.url]).join(', ');
    throw new Error(`资源访问失败，请检查网络连接是否正常。item = ${failedItems}`);
  }

  console.log('网络检查完成！');
}

async function parallelHttpsCheck(urls: string[]): Promise<ConnCheckRawResult[]> {
  const results = await Promise.allSettled(
    urls.map(url =>
      got(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        },
        throwHttpErrors: false
      }).then((response: Response) => {
        const status = response.statusCode;
        return {
          url,
          ok: (status >= 200 && status < 300) || status === 401
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
      ok: false
    };
  });
}