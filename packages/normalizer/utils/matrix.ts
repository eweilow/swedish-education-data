export function computeStringMetrics(
  str_a: string[],
  str_b: string[],
  metric: (a: string, b: string) => number
) {
  const result: Array<[number, number, number, number]> = [];
  for (let i = 0; i < str_a.length; i++) {
    const b: number[] = [];

    for (let j = 0; j < str_b.length; j++) {
      const val = metric(str_a[i], str_b[j]);
      result.push([i, j, val, val]);
    }
  }

  return result;
}

function normalizeMetrics(
  metrics: Array<[number, number, number, number]>,
  ignoreI: Set<number>,
  ignoreJ: Set<number>
) {
  let max = 0;
  let maxIndex: number | null = null;

  for (let i = 0; i < metrics.length; i++) {
    if (ignoreI.has(metrics[i][0])) continue;
    if (ignoreJ.has(metrics[i][1])) continue;

    if (metrics[i][3] >= max) {
      max = metrics[i][3];
      maxIndex = i;
    }
  }

  return maxIndex;
}

export function computeClosestMatches(
  str_a: string[],
  str_b: string[],
  metric: (a: string, b: string) => number
) {
  const metrics = computeStringMetrics(str_a, str_b, metric);
  const ignoreI = new Set<number>();
  const ignoreJ = new Set<number>();

  const output: number[] = [];
  while (true) {
    const maxIndex = normalizeMetrics(metrics, ignoreI, ignoreJ);
    if (maxIndex == null) break;

    const [i, j, value, origValue] = metrics[maxIndex];
    ignoreI.add(i);
    ignoreJ.add(j);

    output[i] = j;
  }

  return output;
}
