import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { galleryToLines, inr, linesToRecord, recordToLines, slugify } from "@/lib/ops-utils";

export const Route = createFileRoute("/_authenticated/ops/products")({
  component: OpsProducts,
});

type Draft = {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  tagline: string;
  description: string;
  story: string;
  collection_id: string;
  base_price: string;
  hero_image_url: string;
  cutout_image_url: string;
  gallery: string;
  specifications: string;
  sort_order: string;
  is_published: boolean;
  is_featured: boolean;
};

const emptyDraft: Draft = {
  name: "", slug: "", sku: "", tagline: "", description: "", story: "", collection_id: "",
  base_price: "", hero_image_url: "", cutout_image_url: "", gallery: "", specifications: "",
  sort_order: "0", is_published: false, is_featured: false,
};

function OpsProducts() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: products } = useQuery({
    queryKey: ["ops-products"],
    queryFn: async () =>
      (await supabase.from("products").select("*, collections(name)").order("sort_order")).data ?? [],
  });
  const { data: collections } = useQuery({
    queryKey: ["ops-collections"],
    queryFn: async () => (await supabase.from("collections").select("id, name").order("sort_order")).data ?? [],
  });

  const list = (products ?? []).filter((p) =>
    `${p.name} ${p.sku ?? ""} ${p.slug}`.toLowerCase().includes(q.toLowerCase()),
  );

  function edit(p: (typeof list)[number]) {
    setDraft({
      id: p.id,
      name: p.name ?? "",
      slug: p.slug ?? "",
      sku: p.sku ?? "",
      tagline: p.tagline ?? "",
      description: p.description ?? "",
      story: p.story ?? "",
      collection_id: p.collection_id ?? "",
      base_price: p.base_price != null ? String(p.base_price) : "",
      hero_image_url: p.hero_image_url ?? "",
      cutout_image_url: p.cutout_image_url ?? "",
      gallery: galleryToLines(p.gallery),
      specifications: recordToLines(p.specifications),
      sort_order: String(p.sort_order ?? 0),
      is_published: !!p.is_published,
      is_featured: !!p.is_featured,
    });
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload = {
      name: draft.name.trim(),
      slug: (draft.slug || slugify(draft.name)).trim(),
      sku: draft.sku.trim() || null,
      tagline: draft.tagline.trim() || null,
      description: draft.description.trim() || null,
      story: draft.story.trim() || null,
      collection_id: draft.collection_id || null,
      base_price: draft.base_price ? Number(draft.base_price) : null,
      hero_image_url: draft.hero_image_url.trim() || null,
      cutout_image_url: draft.cutout_image_url.trim() || null,
      gallery: draft.gallery.split("\n").map((l) => l.trim()).filter(Boolean),
      specifications: linesToRecord(draft.specifications),
      sort_order: Number(draft.sort_order || 0),
      is_published: draft.is_published,
      is_featured: draft.is_featured,
    };
    const res = draft.id
      ? await supabase.from("products").update(payload).eq("id", draft.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(draft.id ? "Product updated" : "Product created");
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["ops-products"] });
    qc.invalidateQueries({ queryKey: ["ops-inventory"] });
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete “${name}”? This cannot be undone.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Product deleted");
    qc.invalidateQueries({ queryKey: ["ops-products"] });
  }

  async function toggle(id: string, field: "is_published" | "is_featured", v: boolean) {
    const { error } = await supabase.from("products").update(field === "is_published" ? { is_published: !v } : { is_featured: !v }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["ops-products"] });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="h-display text-2xl">Products</h2>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
            className="bg-background border border-input rounded-sm px-3 py-2 text-sm" />
          <button onClick={() => setDraft({ ...emptyDraft })}
            className="text-xs uppercase tracking-widest border border-foreground px-4 py-2 rounded-sm hover:bg-foreground hover:text-background transition-colors">
            Add product
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto border border-border rounded-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="p-3 font-medium">SKU</th>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Collection</th>
              <th className="p-3 font-medium text-right">Price</th>
              <th className="p-3 font-medium text-center">Published</th>
              <th className="p-3 font-medium text-center">Featured</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{p.sku ?? "—"}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-muted-foreground">{p.collections?.name ?? "—"}</td>
                <td className="p-3 text-right">{p.base_price ? inr(Number(p.base_price)) : "—"}</td>
                <td className="p-3 text-center">
                  <button onClick={() => toggle(p.id, "is_published", p.is_published)}
                    className={`text-xs uppercase tracking-widest ${p.is_published ? "text-accent" : "text-muted-foreground"}`}>
                    {p.is_published ? "Live" : "Draft"}
                  </button>
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => toggle(p.id, "is_featured", p.is_featured)}
                    className={`text-xs uppercase tracking-widest ${p.is_featured ? "text-accent" : "text-muted-foreground"}`}>
                    {p.is_featured ? "Yes" : "No"}
                  </button>
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => edit(p)} className="text-xs link-underline">Edit</button>
                  <button onClick={() => remove(p.id, p.name)} className="text-xs link-underline ml-3 text-destructive">Delete</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-xs">No products match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm overflow-y-auto p-4 md:p-10"
          onClick={(e) => { if (e.target === e.currentTarget) setDraft(null); }}>
          <div className="mx-auto max-w-3xl bg-background border border-border rounded-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="h-display text-xl">{draft.id ? "Edit product" : "New product"}</h3>
              <button onClick={() => setDraft(null)} className="text-xs link-underline">Close</button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Name"><input className={inputCls} value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: draft.slug || slugify(e.target.value) })} /></Field>
              <Field label="Slug"><input className={inputCls} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></Field>
              <Field label="SKU"><input className={inputCls} value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} /></Field>
              <Field label="Base price (₹)"><input type="number" className={inputCls} value={draft.base_price} onChange={(e) => setDraft({ ...draft, base_price: e.target.value })} /></Field>
              <Field label="Collection">
                <select className={inputCls} value={draft.collection_id} onChange={(e) => setDraft({ ...draft, collection_id: e.target.value })}>
                  <option value="">—</option>
                  {(collections ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Sort order"><input type="number" className={inputCls} value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} /></Field>
              <Field label="Tagline" wide><input className={inputCls} value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} /></Field>
              <Field label="Description" wide><textarea rows={4} className={inputCls} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
              <Field label="Story / bullets" wide><textarea rows={4} className={inputCls} value={draft.story} onChange={(e) => setDraft({ ...draft, story: e.target.value })} /></Field>
              <Field label="Hero image URL" wide><input className={inputCls} value={draft.hero_image_url} onChange={(e) => setDraft({ ...draft, hero_image_url: e.target.value })} /></Field>
              <Field label="Studio / cutout image URL" wide><input className={inputCls} value={draft.cutout_image_url} onChange={(e) => setDraft({ ...draft, cutout_image_url: e.target.value })} /></Field>
              <Field label="Gallery — one image URL per line" wide><textarea rows={5} className={`${inputCls} font-mono text-xs`} value={draft.gallery} onChange={(e) => setDraft({ ...draft, gallery: e.target.value })} /></Field>
              <Field label="Specifications — one “Key: value” per line" wide><textarea rows={5} className={`${inputCls} font-mono text-xs`} value={draft.specifications} onChange={(e) => setDraft({ ...draft, specifications: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.is_published} onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })} /> Published
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.is_featured} onChange={(e) => setDraft({ ...draft, is_featured: e.target.checked })} /> Featured
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDraft(null)} className="text-xs uppercase tracking-widest px-4 py-2">Cancel</button>
              <button onClick={save} disabled={saving}
                className="text-xs uppercase tracking-widest border border-foreground px-5 py-2 rounded-sm hover:bg-foreground hover:text-background transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full bg-background border border-input rounded-sm px-3 py-2 text-sm";

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <div className="eyebrow mb-1">{label}</div>
      {children}
    </div>
  );
}
