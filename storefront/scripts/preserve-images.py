from pathlib import Path
import json, subprocess, concurrent.futures
root=Path('storefront')
mapping=json.loads((root/'asset-map.json').read_text())
jobs=[('https://prayogdecor.lovable.app'+old, root/'public'/new.lstrip('/')) for old,new in mapping.items()]
for name in ['collection-planters.jpg','collection-tableware.jpg','collection-vessels.jpg','craftsmanship.jpg','hero-ceramics.jpg','interior-inspiration.jpg','product-aurora-vase.jpg','product-ember-teapot.jpg','product-halo-bowl.jpg','product-terra-planter.jpg']:
    jobs.append(('https://prayogdecor.lovable.app/images/'+name,root/'public/images'/name))
    if name in ['collection-planters.jpg','collection-tableware.jpg','collection-vessels.jpg','craftsmanship.jpg','hero-ceramics.jpg','interior-inspiration.jpg']:
        jobs.append(('https://prayogdecor.lovable.app/images/'+name,root/'src/assets'/name))
jobs.append(('https://prayogdecor.lovable.app/favicon.png',root/'public/favicon.png'))
def get(job):
    url,path=job
    path.parent.mkdir(parents=True,exist_ok=True)
    subprocess.run(['curl','--fail','--silent','--show-error','--retry','2','--max-time','90',url,'-o',str(path)],check=True)
    head=path.read_bytes()[:12]
    if not (head.startswith(b'\x89PNG') or head.startswith(b'\xff\xd8') or head.startswith(b'RIFF')): raise ValueError('Invalid image: '+str(path))
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: list(pool.map(get,jobs))
print('Preserved',len(jobs),'image files')
