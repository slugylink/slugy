export function formatNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  }

  const tiers = [
    { threshold: 1000000000, suffix: "B" },
    { threshold: 1000000, suffix: "M" },
    { threshold: 1000, suffix: "k" },
  ];

  for (const { threshold, suffix } of tiers) {
    if (num >= threshold) {
      // Format with one decimal place and remove trailing zeros
      const formatted = (num / threshold).toFixed(1).replace(/\.0$/, "");
      return `${formatted}${suffix}`;
    }
  }

  return num.toString(); // Fallback
}
