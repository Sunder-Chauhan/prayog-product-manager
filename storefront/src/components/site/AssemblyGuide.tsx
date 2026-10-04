import { useState } from 'react';
import { GUIDE_KEY, readGuide, youtubeId } from '../../../../shared/assembly-guide.js';
export { GUIDE_KEY };
type Step = {title?:string;text?:string;variant?:string;image?:string;youtube?:string};
function safePhoto(value?:string){try{return value&&new URL(value).protocol==='https:'?value:undefined}catch{return undefined}}
export function AssemblyGuide({value}:{value:unknown}) {
 const [variant,setVariant]=useState('');
 const steps:Step[]=readGuide(value).steps;
 const variants=[...new Set(steps.map(s=>s.variant?.trim()).filter(Boolean))] as string[];
 if(!steps.length)return null;
 return <section id="assembly-guide" className="mt-10 border-t border-border pt-8"><h2 className="text-2xl">Assembly Guide</h2><p className="mt-2 text-muted-foreground">Follow the photos and videos to assemble your DIY lighting.</p>
 {variants.length>0&&<label className="block mt-4">Size / model<select className="block border rounded p-2 mt-2" value={variant} onChange={e=>setVariant(e.target.value)}><option value="">All sizes / models</option>{variants.map(v=><option key={v}>{v}</option>)}</select></label>}
 <ol className="mt-6 space-y-8">{steps.filter(s=>!variant||!s.variant?.trim()||s.variant.trim()===variant).map((s,i)=>{const id=youtubeId(s.youtube);const photo=safePhoto(s.image);return <li key={i}><h3 className="text-lg">{i+1}. {s.title||'Assembly step'}</h3>{s.variant&&<p className="text-sm text-muted-foreground">{s.variant}</p>}<p className="whitespace-pre-line mt-2">{s.text}</p>{photo&&<img loading="lazy" src={photo} alt={s.title||'Assembly step '+(i+1)} className="mt-4 w-full max-h-96 object-contain"/>}{id&&<><iframe className="mt-4 w-full aspect-video rounded" src={'https://www.youtube-nocookie.com/embed/'+id} title={s.title||'Assembly video '+(i+1)} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/><a className="inline-block mt-2 underline" href={'https://www.youtube.com/watch?v='+id} target="_blank" rel="noopener noreferrer">Watch on YouTube</a></>}</li>})}</ol></section>;
}
