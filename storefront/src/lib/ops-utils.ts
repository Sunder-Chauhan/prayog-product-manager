export const inr = (n: number | null | undefined) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const monthKey = (d: string | Date) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

export const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};

/** last n month keys, oldest first */
export const lastMonths = (n: number) => {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
};

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const linesToRecord = (text: string) => {
  const out: Record<string, string> = {};
  text.split("\n").forEach((line) => {
    const i = line.indexOf(":");
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  return out;
};

export const recordToLines = (obj: unknown) =>
  obj && typeof obj === "object" && !Array.isArray(obj)
    ? Object.entries(obj as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`).join("\n")
    : "";

export const galleryToLines = (g: unknown) =>
  Array.isArray(g)
    ? g.map((item) => (typeof item === "string" ? item : ((item as { url?: string })?.url ?? ""))).filter(Boolean).join("\n")
    : "";
