export const GUIDE_KEY = '_assembly_guide';
export function youtubeId(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase();
    let id;
    if (host === 'youtu.be') id = u.pathname.split('/')[1];
    else if (['youtube.com','www.youtube.com','m.youtube.com'].includes(host)) {
      id = u.pathname === '/watch' ? u.searchParams.get('v') : /^\/(shorts|embed)\//.test(u.pathname) ? u.pathname.split('/')[2] : null;
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null;
  } catch { return null; }
}
export function readGuide(value) {
  try { const g = typeof value === 'string' ? JSON.parse(value) : value; return {steps: Array.isArray(g?.steps) ? g.steps.filter(s=>s && typeof s==='object' && !Array.isArray(s)).map(s=>Object.fromEntries(['title','text','variant','image','youtube'].map(k=>[k,typeof s[k]==='string'?s[k]:'']))) : []}; } catch { return {steps:[]}; }
}
