export function getPolarServer(): "sandbox" | "production" {
  const mode = process.env.POLAR_MODE;
  if (mode === "sandbox" || mode === "production") return mode;
  if (mode) throw new Error("POLAR_MODE must be sandbox or production");
  return process.env.NODE_ENV === "production" ? "production" : "sandbox";
}
