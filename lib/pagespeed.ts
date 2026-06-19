// Google PageSpeed Insights (раздел 4 ТЗ). Работает и без ключа (меньшая квота).
// Некритичный шаг: при сбое возвращаем null, аудит продолжается.
import { env } from "./env";
import { config } from "./config";

export interface PageSpeedMetrics {
  strategy: "mobile" | "desktop";
  performanceScore: number | null; // 0-100
  lcp: string | null;
  cls: string | null;
  inp: string | null;
}

const API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

async function run(url: string, strategy: "mobile" | "desktop"): Promise<PageSpeedMetrics | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.worker.pagespeedTimeoutMs);
  try {
    const u = new URL(API);
    u.searchParams.set("url", url);
    u.searchParams.set("strategy", strategy);
    u.searchParams.set("category", "performance");
    if (env.PAGESPEED_API_KEY) u.searchParams.set("key", env.PAGESPEED_API_KEY);

    const resp = await fetch(u, { signal: ctrl.signal });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } };
        audits?: Record<string, { displayValue?: string }>;
      };
    };
    const lh = json.lighthouseResult;
    const score = lh?.categories?.performance?.score;
    const audits = lh?.audits ?? {};
    return {
      strategy,
      performanceScore: typeof score === "number" ? Math.round(score * 100) : null,
      lcp: audits["largest-contentful-paint"]?.displayValue ?? null,
      cls: audits["cumulative-layout-shift"]?.displayValue ?? null,
      inp:
        audits["interaction-to-next-paint"]?.displayValue ??
        audits["experimental-interaction-to-next-paint"]?.displayValue ??
        audits["total-blocking-time"]?.displayValue ??
        null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getPageSpeed(url: string): Promise<{ mobile: PageSpeedMetrics | null; desktop: PageSpeedMetrics | null }> {
  const [mobile, desktop] = await Promise.all([run(url, "mobile"), run(url, "desktop")]);
  return { mobile, desktop };
}
