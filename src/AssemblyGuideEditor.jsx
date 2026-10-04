import React from 'react';
import {GUIDE_KEY, readGuide} from '../shared/assembly-guide.js';
export default function AssemblyGuideEditor({draft,update,disabled,uploadPhoto}) {
 const guide=readGuide(draft.specifications?.[GUIDE_KEY]);
 const save=steps=>update('specifications',{...draft.specifications,[GUIDE_KEY]:JSON.stringify({steps})});
 const change=(i,key,value)=>save(guide.steps.map((s,n)=>n===i?{...s,[key]:value}:s));
 const move=(i,delta)=>{const steps=[...guide.steps];[steps[i],steps[i+delta]]=[steps[i+delta],steps[i]];save(steps)};
 return <section className="form-section assembly-editor"><h3>DIY Assembly Guide</h3><p>Add ordered instructions, photos and multiple YouTube videos. Use the size/model field when instructions differ between variants.</p>
 {guide.steps.map((s,i)=><fieldset key={i} disabled={disabled} className="assembly-step"><legend>Step {i+1}</legend>
 { [['title','Step title'],['variant','Size / model (optional)'],['youtube','YouTube video link (optional)']].map(([key,label])=><label key={key} className="field"><span>{label}</span><input value={s[key]||''} onChange={e=>change(i,key,e.target.value)}/></label>)}
 <label className="field"><span>Instructions</span><textarea rows={3} value={s.text||''} onChange={e=>change(i,'text',e.target.value)}/></label>
 <label className="field"><span>Step photo</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(file){const url=await uploadPhoto(file);if(url)change(i,'image',url)}}}/></label>
 {s.image&&<><img src={s.image} alt={s.title||'Assembly step'} style={{maxWidth:180,maxHeight:180,objectFit:'contain'}}/><button className="secondary" type="button" onClick={()=>change(i,'image','')}>Remove photo</button></>}
 <div className="assembly-actions"><button className="secondary" type="button" disabled={disabled||i===0} onClick={()=>move(i,-1)}>Move up</button><button className="secondary" type="button" disabled={disabled||i===guide.steps.length-1} onClick={()=>move(i,1)}>Move down</button><button className="secondary" type="button" onClick={()=>save(guide.steps.filter((_,n)=>n!==i))}>Remove step</button></div>
 </fieldset>)}<button className="secondary" type="button" disabled={disabled} onClick={()=>save([...guide.steps,{title:'',text:'',variant:'',youtube:'',image:''}])}>Add instruction / video step</button></section>;
}
