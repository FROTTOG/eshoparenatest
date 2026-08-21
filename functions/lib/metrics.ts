/**
 * Metriky do Cloudflare Analytics Engine (nepovinné).
 * Pokud vazba METRICS ([[analytics_engine_datasets]]) není nastavená,
 * volání jsou prázdná — kód funguje i bez nich. Zapojení viz README.
 */

type MetricRow = {
  doubles?: number[];
  blobs?: string[];
  indexes?: [string];
};

export function writeMetric(
  env: { METRICS?: { writeDataPoint: (row: MetricRow) => void } },
  name: string,
  doubles: number[],
  blobs: string[] = []
): void {
  try {
    if (!env.METRICS) return;
    env.METRICS.writeDataPoint({ indexes: [name], doubles, blobs });
  } catch {
    /* metriky nikdy nesmí shodit požadavek */
  }
}
