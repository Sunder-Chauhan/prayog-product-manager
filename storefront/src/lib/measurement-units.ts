export type LengthUnit = "cm" | "in";

// Convert only whole measurement values, never numbers embedded in care text.
// For legacy dual-unit values, prefer the cm measurement as the source.
export function formatMeasurement(value: unknown, unit: LengthUnit): string {
  const text = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  const scalar = "\\d+(?:\\.\\d+)?";
  const measure = `(${scalar}(?:\\s*[×x]\\s*${scalar})*)\\s*(cm|mm|inches|inch|in|[\"″])`;
  const match = text.match(new RegExp(`^\\s*(approx\\.?\\s*|≈\\s*)?${measure}(?:\\s*\\(\\s*${measure}\\s*\\))?\\s*$`, "i"));
  if (!match) return text;
  const useSecondary = match[5]?.toLowerCase() === "cm";
  const numbers = useSecondary ? match[4] : match[2];
  const sourceUnit = (useSecondary ? match[5] : match[3]).toLowerCase();
  const factor = sourceUnit === "cm" ? 1 : sourceUnit === "mm" ? 0.1 : 2.54;
  const converted = numbers.split(/\s*[×x]\s*/).map((n) => {
    const cm = Number(n) * factor;
    return Number((unit === "cm" ? cm : cm / 2.54).toFixed(2)).toString();
  });
  return `${match[1] ?? ""}${converted.join(" × ")} ${unit}`;
}
