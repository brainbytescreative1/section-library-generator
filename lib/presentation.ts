import reference from './reference-templates.json';
import {Layout,Project,pattern,publicHref} from './model';
import {SectionPreview,renderSectionPreview} from './section-preview';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const lorem='Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum iaculis. Aenean euismod nibh at facilisis posuere.';
const extraCSS=`
#mv-layout-library .atlas-grid{display:grid;grid-template-columns:repeat(var(--cols,3),minmax(0,1fr));gap:24px;margin-top:30px}
#mv-layout-library .atlas-stat strong{display:block;font-size:65px;letter-spacing:-.06em;line-height:1.1;margin-bottom:12px;color:#1c5061}
#mv-layout-library .atlas-stat p{font-size:13px}
#mv-layout-library .atlas-faq{max-width:850px;margin:30px auto 0;text-align:left}
#mv-layout-library .atlas-faq details{border-bottom:1px solid #cee2e8;padding:22px 0}
#mv-layout-library .atlas-faq summary{cursor:pointer;font-weight:700;font-size:19px}
#mv-layout-library .atlas-faq details p{padding-top:18px}
#mv-layout-library .atlas-price{background:white;text-align:left;padding:32px;border:1px solid #d1e5ec;border-radius:16px}
#mv-layout-library .atlas-price h4{font-size:21px}
#mv-layout-library .atlas-price strong{display:block;font-size:50px;letter-spacing:-.04em;margin:20px 0}
#mv-layout-library .atlas-price p{font-size:13px}
#mv-layout-library .atlas-price ul{padding-left:18px;line-height:2;margin-bottom:25px}
#mv-layout-library .atlas-tabs{max-width:850px;margin:30px auto 0;text-align:left}
#mv-layout-library .atlas-tabbar{display:flex;gap:10px;border-bottom:1px solid #c5dce3;padding-bottom:15px}
#mv-layout-library .atlas-tabbar button{background:#e5f4f8;padding:11px 18px;border-radius:6px;color:#245f73}
#mv-layout-library .atlas-tabbar button[aria-selected=true]{background:#1b5063;color:white}
#mv-layout-library .atlas-tabpanel{padding:30px;background:#f4f9fa;margin-top:20px;border-radius:12px}
#mv-layout-library .atlas-step{border-top:1px solid #bbd9e3;padding-top:25px;text-align:left}
#mv-layout-library .atlas-step b{font-size:12px;letter-spacing:.1em;color:#2c9aba}
#mv-layout-library .atlas-step h4{font-size:24px;margin:20px 0}
#mv-layout-library .atlas-step p{font-size:14px}
#mv-layout-library .atlas-gallery{display:grid;grid-template-columns:2fr 1fr 1fr;gap:16px}
#mv-layout-library .atlas-gallery>div{min-height:240px;border-radius:15px;background:#d8e8ed;display:grid;place-items:center;color:#5c7e8b;font-size:11px}
#mv-layout-library .atlas-gallery>div:nth-child(2){background:#e6e2db}
#mv-layout-library .atlas-custom{padding:28px;background:#f0f7f9;border-radius:12px;text-align:left}
#mv-layout-library .atlas-custom h4{font-size:24px;margin-bottom:17px}
#mv-layout-library .atlas-custom p{font-size:15px}
#mv-layout-library .atlas-intro{padding:65px 0 45px}
#mv-layout-library .atlas-intro h1{font-size:clamp(34px,5vw,62px);margin:16px 0 22px;max-width:950px}
#mv-layout-library .atlas-intro p{color:#5a7682;max-width:760px}
#mv-layout-library .atlas-intro a{color:#2c7a94;text-decoration:underline;text-underline-offset:4px}
#mv-layout-library .atlas-source-summary{font-size:12px;margin-top:20px}
#mv-layout-library .atlas-controls{display:flex;justify-content:space-between;gap:20px;margin-bottom:30px;font-size:12px;color:#587783}
#mv-layout-library .atlas-controls input{accent-color:#3997b4}
#mv-layout-library .atlas-controls button{border:1px solid #c2d9e1;background:white;border-radius:5px;padding:8px 12px;color:#35677a}
#mv-layout-library.atlas-no-notes .mv-note{display:none}
#mv-layout-library .mv-demo .mv-image>span{font-size:10px}
#mv-layout-library .mv-demo .mv-media-art>span{animation:none}
#mv-layout-library .mv-demo .mv-logo-track{animation:none}
@media(max-width:700px){#mv-layout-library .atlas-grid,#mv-layout-library .atlas-gallery{grid-template-columns:1fr!important}#mv-layout-library .atlas-gallery>div{min-height:200px}#mv-layout-library .atlas-intro{padding:40px 0 30px}#mv-layout-library .atlas-stat strong{font-size:54px}#mv-layout-library .atlas-tabbar{gap:5px}#mv-layout-library .atlas-tabbar button{padding:9px;font-size:11px}#mv-layout-library .atlas-controls{flex-wrap:wrap}}
@media print{#mv-layout-library .atlas-controls{display:none}#mv-layout-library .mv-specimen{break-before:page}#mv-layout-library .atlas-intro{padding:20px 0}}
`;
export const presentationCSS=reference.css+'\n'+extraCSS;
function extraTemplate(type:number,columns=2){
  const head=(label:string,title:string)=>`<p class="mv-eyebrow">${label}</p><h3 class="mv-title">${title}</h3>`;
  if(type===18)return `<div class="mv-pad mv-centered">${head('AT A GLANCE','A few example numbers.')}<div class="atlas-grid">${['00+','00%','000'].map((n,i)=>`<div class="atlas-stat"><strong>${n}</strong><p>Example metric ${i+1}<br>A short supporting caption.</p></div>`).join('')}</div></div>`;
  if(type===19)return `<div class="mv-pad mv-centered mv-tint">${head('EXAMPLE QUESTIONS','Answers in one place.')}<div class="atlas-faq">${[1,2,3,4].map(n=>`<details ${n===1?'open':''}><summary>An example question ${n} goes here?</summary><p>${lorem}</p></details>`).join('')}</div></div>`;
  if(type===20)return `<div class="mv-pad mv-centered mv-tint">${head('EXAMPLE PLANS','Compare a few possibilities.')}<div class="atlas-grid">${[1,2,3].map(n=>`<article class="atlas-price"><h4>Example plan ${n}</h4><strong>$00</strong><p>Example billing interval</p><ul><li>Example feature one</li><li>Example feature two</li><li>Example feature three</li></ul><a class="mv-button" href="#">Example action →</a></article>`).join('')}</div></div>`;
  if(type===21)return `<div class="mv-pad mv-centered">${head('EXAMPLE TOPICS','A place for related content.')}<div class="atlas-tabs"><div class="atlas-tabbar" role="tablist" aria-label="Example content">${[1,2,3].map(n=>`<button type="button" role="tab" aria-selected="${n===1}" id="atlas-tab-${n}" aria-controls="atlas-panel-${n}" tabindex="${n===1?0:-1}">Example tab ${n}</button>`).join('')}</div>${[1,2,3].map(n=>`<div class="atlas-tabpanel" id="atlas-panel-${n}" role="tabpanel" aria-labelledby="atlas-tab-${n}" ${n===1?'':'hidden'}><h4>Example topic ${n}</h4><p>${lorem}</p></div>`).join('')}</div></div>`;
  if(type===22)return `<div class="mv-pad mv-centered">${head('EXAMPLE PROCESS','A clear sequence of steps.')}<div class="atlas-grid">${[1,2,3].map(n=>`<div class="atlas-step"><b>STEP 0${n}</b><h4>Example step ${n}</h4><p>${lorem}</p></div>`).join('')}</div></div>`;
  if(type===23)return `<div class="mv-pad mv-centered">${head('EXAMPLE GALLERY','Let the visuals do the talking.')}<div class="atlas-gallery"><div>Large image placeholder</div><div>Image placeholder</div><div>Image placeholder</div></div></div>`;
  return `<div class="mv-pad mv-centered">${head('EXAMPLE CONTENT','A flexible content section.')}<div class="atlas-grid" style="--cols:${Math.max(1,Math.min(4,columns))}">${Array.from({length:Math.max(1,Math.min(4,columns))},(_,i)=>`<div class="atlas-custom"><h4>Example topic ${i+1}</h4><p>${lorem}</p></div>`).join('')}</div></div>`;
}
export function templateHTML(type:number,columns?:number){
  const html=(reference.templates as Record<string,string>)[String(type)]||extraTemplate(type,columns);
  return html.replace(/href="#layout-[^"]*"/g,'href="#"').replace(/<button[^>]*class="(?:mv-media-toggle|mv-logo-toggle)[\s\S]*?<\/button>/g,'').replace('Animated layout preview · no video file','Media placeholder · replace with a video').replace('Two moving rows','Two rows');
}
export function previewDocument(type:number,columns?:number,preview?:SectionPreview){
  if(preview)return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:#fff;height:100%;overflow:hidden}body>svg{width:100%!important;height:100%!important}</style></head><body>${renderSectionPreview(preview)}</body></html>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}${presentationCSS}#mv-layout-library .mv-demo{border:0;border-radius:0;box-shadow:none}#mv-layout-library .mv-pad{padding:48px 6%}#mv-layout-library .mv-hero-light.mv-centered{padding:65px 6%}#mv-layout-library *{animation:none!important}#mv-layout-library .mv-person,#mv-layout-library .mv-article{box-shadow:none}</style></head><body><div id="mv-layout-library"><div class="mv-demo">${templateHTML(type,columns)}</div></div></body></html>`;
}
const exportScript=`(()=>{const r=document.getElementById('mv-layout-library');const note=r.querySelector('[data-notes]');if(note)note.addEventListener('change',e=>r.classList.toggle('atlas-no-notes',!e.target.checked));r.querySelector('[data-print]')?.addEventListener('click',()=>window.print());r.querySelectorAll('.atlas-tabs').forEach(t=>{const tabs=[...t.querySelectorAll('[role=tab]')];const select=b=>{tabs.forEach(x=>{const on=x===b;x.setAttribute('aria-selected',String(on));x.tabIndex=on?0:-1;t.querySelector('#'+x.getAttribute('aria-controls')).hidden=!on;});};tabs.forEach((b,i)=>{b.addEventListener('click',()=>select(b));b.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=tabs[(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];select(next);next.focus();}});});});r.querySelectorAll('.mv-filters').forEach(g=>g.querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>{g.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));g.parentElement.querySelectorAll('.mv-article').forEach((a,n)=>a.hidden=i>0&&n%3!==i-1);})));r.querySelectorAll('.mv-pagination').forEach(e=>e.remove());r.querySelectorAll('.mv-form-preview').forEach(b=>b.addEventListener('click',()=>b.parentElement.querySelector('.mv-form-status').textContent='Layout preview only. Nothing was sent or saved.'));r.querySelectorAll('a[href="#"]').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));r.querySelectorAll('.mv-bio-button,.mv-article-button').forEach(b=>b.addEventListener('click',()=>{let p=b.parentElement.querySelector('[data-example-note]');if(!p){p=document.createElement('p');p.dataset.exampleNote='true';p.className='mv-demo-disclaimer';b.parentElement.appendChild(p);}p.textContent='Example destination. Replace this action when creating a real page.';}));r.querySelectorAll('.mv-testimonial').forEach(t=>{let index=0;const buttons=[...t.querySelectorAll('.mv-dots button')];const update=n=>{index=(n+3)%3;t.querySelector('.mv-attribution strong').textContent='Example person 0'+(index+1);t.querySelector('.mv-sample-logo').textContent='◇ ORGANIZATION 0'+(index+1);buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));};t.querySelector('.mv-carousel-prev')?.addEventListener('click',()=>update(index-1));t.querySelector('.mv-carousel-next')?.addEventListener('click',()=>update(index+1));buttons.forEach((b,i)=>b.addEventListener('click',()=>update(i)));});})();`;
export function exportPresentation(project:Project,embed=false){
  const layouts=project.layouts.filter(l=>l.included),title=esc(project.title||'Section layout library');
  const index=layouts.map((l,i)=>`<a href="#atlas-layout-${i+1}"><span>${String(i+1).padStart(2,'0')}</span>${esc(l.title)}</a>`).join('');
  const sections=layouts.map((l,i)=>`<section class="mv-specimen" id="atlas-layout-${i+1}"><div class="mv-specimen-heading"><span class="mv-number">${String(i+1).padStart(2,'0')}</span><div><p class="mv-category">${esc(l.category)}</p><h2>${esc(l.title)}</h2></div></div><p class="mv-note">${esc(pattern(l.type)[2])}</p><div class="mv-sources"><span>Used on</span>${l.sources.filter(s=>publicHref(s.url)).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`).join('')||'<span>No source page assigned</span>'}</div><div class="mv-demo">${(l.preview?renderSectionPreview(l.preview):templateHTML(l.type,l.columns)).replace(/atlas-(tab|panel)-(\d+)/g,`atlas-$1-${i}-$2`)}</div></section>`).join('');
  const content=`<style>${presentationCSS}</style><div id="mv-layout-library"><div class="mv-shell"><header class="atlas-intro"><p class="mv-overline">SECTION LAYOUT REFERENCE</p><h1>${title}</h1><p>A visual collection of reusable section structures, with generic text and neutral image placeholders. Focus on composition, then use the source links to compare the original pages.</p><p class="atlas-source-summary">${layouts.length} layouts · ${project.pages.filter(p=>p.status==='done').length} pages read · <a href="${esc(project.url)}" target="_blank" rel="noopener noreferrer">${esc(new URL(project.url).hostname)}</a><br>${project.sample?'Based on a manually reviewed sample.':'Measured from this website’s sections, with generic copy and image placeholders. Verify source pages before implementation.'}</p></header><div class="atlas-controls"><label><input type="checkbox" data-notes checked> Show layout notes</label><button type="button" data-print>Print / save PDF</button></div><nav class="mv-index" aria-label="Layout index">${index}</nav>${sections}<footer class="mv-library-footer"><p>Created with Layout Atlas. All example copy, identities, logos and contact information are placeholders.<br>HTML layout references for review; page-builder templates must be created separately.</p><a href="#mv-layout-library">Back to top ↑</a></footer></div></div><script>${exportScript}</script>`;
  return embed?content:`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><style>body{margin:0;background:#f4f7f8}</style></head><body>${content}</body></html>`;
}
export function downloadFile(filename:string,content:string,type='text/html'){
  const blob=new Blob([content],{type:type+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
