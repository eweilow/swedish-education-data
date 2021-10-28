export function computeStringMetrics(
  str_a: string[],
  str_b: string[],
  metric: (a: string, b: string) => number
) {
  const a: number[][] = [];
  for (let i = 0; i < str_a.length; i++) {
    const b: number[] = [];

    for (let j = 0; j < str_b.length; j++) {
      b[j] = metric(str_a[i], str_b[j]);
    }

    a[i] = b;
  }

  return a;
}

export function computeClosestMatches(
  str_a: string[],
  str_b: string[],
  metric: (a: string, b: string) => number
) {
  const matrix = computeStringMetrics(str_a, str_b, metric);

  return matrix.map((a) => {
    const [bestA] = [...a].sort((a, b) => b - a);
    const bestIndex = a.indexOf(bestA);

    return a.map((_, i) => {
      if (i === bestIndex) {
        return 1;
      }
      return 0;
    });
  });
}
