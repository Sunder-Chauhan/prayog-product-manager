import {createFileRoute} from '@tanstack/react-router';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {sharedRpc} from '@/integrations/supabase/client';
import {AssemblyGuide} from '@/components/site/AssemblyGuide';
import {readGuide} from '../../../shared/assembly-guide.js';
export const Route=createFileRoute('/guide')({head:()=>({meta:[{title:'Assembly Guides — Prayog Decor'},{name:'description',content:'Find DIY lighting assembly instructions by product name or SKU.'}]}),component:Guides});
type Guide={sku:string;name:string;guide:unknown};
function Guides(){
 const [search,setSearch]=useState('');
 const {data,isPending,error,refetch}=useQuery({queryKey:['assembly-guides'],queryFn:async()=>{const r=await sharedRpc('storefront_guides');if(r.error)throw r.error;return (r.data??[]) as Guide[]}});
 const guides=(data??[]).filter(g=>readGuide(g.guide).steps.length>0).filter(g=>(g.sku+' '+g.name).toLowerCase().includes(search.trim().toLowerCase()));
 return <main className="container-editorial py-16 md:py-24"><div className="eyebrow">Product support</div><h1 className="h-display text-4xl md:text-6xl mt-4">Assembly Guides</h1><p className="mt-4 text-muted-foreground">Find your DIY lighting instructions—even if you purchased on Amazon or Flipkart.</p><label className="block mt-8">Search product name or SKU<input className="block w-full max-w-xl border border-border rounded p-3 mt-2 bg-background" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Enter the SKU printed on your package"/></label>
 {isPending&&<p role="status" className="mt-8">Loading guides…</p>}{error&&<div role="alert" className="mt-8"><p>Guides could not load.</p><button onClick={()=>refetch()} className="underline">Try again</button></div>}
 {!isPending&&!error&&!guides.length&&<p className="mt-8">{search?'No matching guide found. Check your product name or SKU.':'Assembly guides will appear here when they are published.'}</p>}
 <div className="mt-10 space-y-6">{guides.map(g=><details key={g.sku} id={g.sku.toLowerCase()} className="border border-border rounded p-5"><summary className="cursor-pointer text-lg font-serif">{g.name} · {g.sku}</summary><AssemblyGuide value={g.guide}/></details>)}</div></main>;
}
