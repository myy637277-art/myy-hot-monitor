const VERIFY_RE =
  /captcha|recaptcha|hcaptcha|unusual traffic|verify you are human|are you a robot|bot detection|challenge-platform|cf-chl|验证码|安全验证|人机验证|访问验证|异常流量|enablejs|enable javascript|没有被重定向/i;

export function crawlerUa(contact: string | undefined): string {
  const who = contact?.trim() || 'unset';
  return `myy-hot-monitor/0.1 (personal research; contact: ${who})`;
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly kind: 'timeout' | 'network',
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function isTimeout(err: unknown): boolean {
  return err instanceof HttpError && err.kind === 'timeout';
}

function visibleHead(body: string): string {
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .slice(0, 20_000);
}

/** 403/429, or a verification / block page identified by keywords in the visible page. */
export function isVerification(status: number, body: string): boolean {
  if (status === 403 || status === 429) return true;
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1] ?? '';
  return VERIFY_RE.test(`${title}\n${visibleHead(body)}`);
}

function charsetOf(header: string, buf: Buffer): string {
  const fromHeader = /charset=([^;\s]+)/i.exec(header)?.[1]?.toLowerCase();
  const hinted = fromHeader ?? /charset=["']?\s*([^"'\s;>]+)/i.exec(buf.subarray(0, 800).toString('latin1'))?.[1]?.toLowerCase();
  if (hinted === 'gb2312' || hinted === 'gbk') return 'gb18030';
  return hinted || 'utf-8';
}

export async function fetchUrl(
  doFetch: typeof fetch,
  url: string,
  opts: { timeoutMs: number; ua: string; headers?: Record<string, string> },
): Promise<{ status: number; ok: boolean; body: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  try {
    const res = await doFetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/json,application/xml,text/xml,*/*',
        'User-Agent': opts.ua,
        ...opts.headers,
      },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    let body: string;
    try {
      body = new TextDecoder(charsetOf(res.headers.get('content-type') ?? '', buf)).decode(buf);
    } catch {
      body = buf.toString('utf8');
    }
    return { status: res.status, ok: res.ok, body };
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'AbortError' || ctrl.signal.aborted) throw new HttpError('timeout', 'timeout');
    throw new HttpError(err instanceof Error ? err.message : 'network', 'network');
  } finally {
    clearTimeout(timer);
  }
}
