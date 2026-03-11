export const wilsonInterval = (
  successes: number,
  total: number,
  z = 1.96
): { low: number; high: number } => {
  if (total === 0) {
    return { low: 0, high: 0 };
  }

  const phat = successes / total;
  const denominator = 1 + (z * z) / total;
  const center = (phat + (z * z) / (2 * total)) / denominator;
  const margin =
    (z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total)) /
    denominator;

  return {
    low: Math.max(0, center - margin),
    high: Math.min(1, center + margin)
  };
};
