export function fadeUp(
  delay = 0,
  {
    amount = 0.2,
    duration = 0.45,
  }: { amount?: number; duration?: number } = {},
) {
  return {
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount },
    transition: { duration, delay },
  };
}
