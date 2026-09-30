import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
const raw = createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
export async function sharedRpc(name: string, args?: Record<string, unknown>) {
  return (raw as unknown as SupabaseClient).rpc(name, args);
}
export async function getCatalog() {
  const { data, error } = await sharedRpc('storefront_catalog');
  if (error) throw error;
  const products = data.products ?? [];
  // Collection covers come from published catalog products, never demo imagery.
  const collectionMap = new Map<string, any>();
  const orderedProducts = [...products].sort((a: any, b: any) =>
    Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) ||
    String(a.sku ?? '').localeCompare(String(b.sku ?? '')));
  for (const product of orderedProducts) {
    if (!product.collections || !product.collection_id) continue;
    const cover = product.hero_image_url || product.cutout_image_url;
    const existing = collectionMap.get(product.collection_id);
    if (!existing) {
      collectionMap.set(product.collection_id, {
        ...product.collections,
        id: product.collection_id,
        is_published: true,
        cover_image_url: cover || null,
      });
    } else if (!existing.cover_image_url && cover) {
      existing.cover_image_url = cover;
    }
  }
  const collections = [...collectionMap.values()];
  return { products, collections };
}
class ReadQuery {
  private predicates: Array<(r: any) => boolean> = [];
  private sorting?: { key: string; asc: boolean };
  private count?: number;
  private singleMode?: 'single' | 'maybe';
  constructor(private load: () => Promise<any[]>) {}
  select() { return this; }
  eq(k: string, v: unknown) { this.predicates.push(r => r[k] === v); return this; }
  neq(k: string, v: unknown) { this.predicates.push(r => r[k] !== v); return this; }
  order(key: string, opts?: { ascending?: boolean }) { this.sorting = { key, asc: opts?.ascending !== false }; return this; }
  limit(n: number) { this.count = n; return this; }
  maybeSingle() { this.singleMode = 'maybe'; return this; }
  single() { this.singleMode = 'single'; return this; }
  async execute() {
    try {
      let rows = (await this.load()).filter(r => this.predicates.every(p => p(r)));
      if (this.sorting) { const { key, asc } = this.sorting; rows.sort((a,b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (asc ? 1 : -1)); }
      if (this.count !== undefined) rows = rows.slice(0,this.count);
      if (this.singleMode && (rows.length > 1 || (rows.length === 0 && this.singleMode === 'single'))) throw new Error('Record not found');
      return { data: this.singleMode ? rows[0] ?? null : rows, error: null };
    } catch(error) { return { data: null, error }; }
  }
  then(onfulfilled?: any, onrejected?: any) { return this.execute().then(onfulfilled,onrejected); }
}
// Preserve the existing storefront's read-query interface while routing public reads through safe RPCs.
export const supabase = new Proxy(raw, {
  get(target, prop) {
    if (prop === 'from') return (table: string) => {
      if (table === 'products' || table === 'collections') return new ReadQuery(async () => (await getCatalog())[table]);
      if (table === 'orders') return new ReadQuery(async () => { const r = await sharedRpc('storefront_orders'); if(r.error) throw r.error; return r.data ?? []; });
      if (['profiles','addresses','organizations','wishlist','quotations'].includes(table)) return (target.from as any)('storefront_'+table);
      throw new Error('Use Prayog Manager for business operations');
    };
    const value = Reflect.get(target, prop);
    return typeof value === 'function' ? value.bind(target) : value;
  }
}) as typeof raw;
