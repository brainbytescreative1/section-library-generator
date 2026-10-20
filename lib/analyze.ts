import {Layout,PageSource,ScanPage,pattern,publicHref,mergeLayout} from './model';
export type FetchedPage={url:string;html:string;css:string[];warnings:string[]};
export async function fetchPage(url:string,signal?:AbortSignal):Promise<FetchedPage>{
  const response=await fetch('/api/page',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal});
  const data=await response.json() as FetchedPage & {error?:string};if(!response.ok)throw new Error(data.error||'This page could not be read.');return data;
}
function dom(html:string){return new DOMParser().parseFromString(html,'text/html');}
export function discoverNavigation(page:FetchedPage):{title:string;pages:ScanPage[]}{
  const doc=dom(page.html),base=new URL(page.url),links=new Map<string,ScanPage>();
  const add=(href:string,title:string)=>{try{const u=new URL(href,base);u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|ref)$/i.test(k))u.searchParams.delete(k);if(u.hostname.replace(/^www\./,'')===base.hostname.replace(/^www\./,'')){u.hostname=base.hostname;u.protocol=base.protocol;}if(u.origin!==base.origin||!publicHref(u.href)||/\.(pdf|zip|png|jpe?g|svg|webp|gif|mp4|docx?|xlsx?)$/i.test(u.pathname)||/\/(wp-admin|wp-login|cart|checkout|account|login|signin|logout|feed|search)(\/|$)/i.test(u.pathname))return;const key=u.origin+(u.pathname.replace(/\/+$/,'')||'/')+u.search;if(links.size<24)links.set(key,{url:u.href,title:title.trim().replace(/\s+/g,' ').slice(0,80)||u.pathname,selected:links.size<12,status:'ready'});}catch{}};
  add(base.href,'Home / starting page');
  let navs=[...doc.querySelectorAll('nav,[role="navigation"],header,.site-header,#masthead,.elementor-location-header')];
  if(!navs.length)navs=[...doc.querySelectorAll('[class*="menu"],[id*="menu"]')].filter(e=>!e.closest('footer')).slice(0,5);
  if(!navs.length)navs=[doc.body];
  navs.forEach(n=>n.querySelectorAll('a[href]').forEach(a=>add(a.getAttribute('href')!,a.textContent||'')));
  return {title:(doc.querySelector('title')?.textContent||base.hostname).replace(/\s+/g,' ').trim().slice(0,120),pages:[...links.values()]};
}
function cleanCSS(css:string){return css.replace(/@import\s+(?:url\([^)]*\)|["'][^"']*["'])[^;]*;/gi,'').replace(/@font-face\s*\{[^}]*\}/gi,'').replace(/url\([^)]*\)/gi,'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27600%27 height=%27440%27%3E%3Crect width=%27600%27 height=%27440%27 fill=%27%23cbdde2%27/%3E%3C/svg%3E")').replace(/<\/style/gi,'');}
function sanitizedDocument(page:FetchedPage){
  const doc=dom(page.html);doc.querySelectorAll('script,noscript,iframe,object,embed,base,meta,link,foreignObject,template').forEach(e=>e.remove());
  doc.querySelectorAll('*').forEach(e=>{
    for(const a of [...e.attributes]){
      if(/^on/i.test(a.name)||['srcdoc','srcset','action','formaction','ping','autofocus','nonce','integrity'].includes(a.name))e.removeAttribute(a.name);
    }
    if(e.hasAttribute('href')){e.setAttribute('data-atlas-href',e.getAttribute('href')||'');e.removeAttribute('href');}
    if(e.hasAttribute('style')){if(/url\s*\(/i.test(e.getAttribute('style')||''))e.setAttribute('data-atlas-background','true');e.setAttribute('style',cleanCSS(e.getAttribute('style')||''));}
    if(e.tagName==='IMG'){
      e.setAttribute('data-atlas-image','true');e.removeAttribute('loading');
      e.setAttribute('src','data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="440"><rect width="600" height="440" fill="#cbdde2"/></svg>'));
    }else if(e.hasAttribute('src'))e.removeAttribute('src');
    if(e.tagName==='INPUT')e.removeAttribute('value');
    if(e.tagName==='STYLE')e.textContent=cleanCSS(e.textContent||'');
  });
  // No target scripts, remote assets, or forms can execute in the measurement frame.
  const csp="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; form-action 'none'; base-uri 'none'";
  const inline=[...doc.head.querySelectorAll('style')].map(s=>s.textContent||'').join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><style>${page.css.map(cleanCSS).join('\n')}\n${inline}</style><style>html{width:1440px}body{margin:0}*,*:before,*:after{animation:none!important;transition:none!important;opacity:1!important;visibility:visible!important}img{max-width:100%}a{cursor:default}video{min-height:180px}header,footer,nav,[role=navigation],.elementor-location-header,.elementor-location-footer{display:none!important}</style></head><body>${doc.body.innerHTML}</body></html>`;
}
function concise(s:string,max=150){return s.replace(/\s+/g,' ').trim().slice(0,max);}
export async function analyzePage(page:FetchedPage,source:PageSource,signal?:AbortSignal):Promise<{layouts:Layout[];sections:number;warning?:string}>{
  if(signal?.aborted)throw new DOMException('Stopped','AbortError');
  const iframe=document.createElement('iframe');iframe.setAttribute('sandbox','allow-same-origin');iframe.setAttribute('aria-hidden','true');iframe.tabIndex=-1;
  Object.assign(iframe.style,{position:'fixed',left:'-20000px',top:'0',width:'1440px',height:'1100px',pointerEvents:'none',border:'0'});
  try{
    await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('The page structure could not be measured.')),8000);iframe.onload=()=>{clearTimeout(timer);resolve();};iframe.srcdoc=sanitizedDocument(page);document.body.appendChild(iframe);});
    if(signal?.aborted)throw new DOMException('Stopped','AbortError');
    const doc=iframe.contentDocument!,win=iframe.contentWindow!;
    const rect=(e:Element)=>e.getBoundingClientRect();
    const visible=(e:Element)=>{const r=rect(e);return r.width>5&&r.height>5&&win.getComputedStyle(e).display!=='none';};
    const clean=(e:Element)=>!e.closest('header,footer,nav,.elementor-location-header,.elementor-location-footer,[aria-hidden="true"]');
    const root=doc.querySelector('main,[data-elementor-type="wp-page"],#content .elementor,.site-main,article')||doc.body;
    const selector='section,.elementor-top-section,.e-con,[data-element_type="container"]';
    let candidates=[...root.querySelectorAll(selector)].filter(e=>clean(e)&&visible(e)&&e.querySelector('h1,h2,h3,p,img,form,video,svg'));
    let outer=candidates.filter(e=>!candidates.some(other=>other!==e&&other.contains(e)));
    if(!outer.length)outer=[...root.children].filter(e=>visible(e)&&clean(e)&&e.querySelector('h1,h2,p,img,form'));
    const expanded:Element[]=[];
    function expand(e:Element,depth=0){
      const inner=candidates.filter(c=>c!==e&&e.contains(c)&&!candidates.some(mid=>mid!==e&&mid!==c&&e.contains(mid)&&mid.contains(c)));
      const sorted=inner.filter(visible).sort((a,b)=>rect(a).top-rect(b).top);
      const vertical=sorted.length>1&&sorted.slice(1).every((c,i)=>rect(c).top>=rect(sorted[i]).bottom-30);
      if(depth<4&&vertical&&rect(e).height>1100){sorted.forEach(c=>expand(c,depth+1));}else expanded.push(e);
    }
    outer.forEach(e=>expand(e));
    // Generic themes often use div wrappers; supplement with heading-led rows.
    if(expanded.length<2){
      const groups=[...root.querySelectorAll('h1,h2')].filter(e=>visible(e)&&clean(e)).map(h=>{
        let e=h.parentElement!;for(let i=0;i<4&&e.parentElement&&e.parentElement!==root;i++){const p=e.parentElement;if(p.querySelectorAll('h1,h2').length>2||rect(p).height>1500)break;e=p;}return e;
      });
      if(groups.length>expanded.length){expanded.length=0;groups.forEach(e=>{if(!expanded.some(x=>x.contains(e)||e.contains(x)))expanded.push(e);});}
    }
    const unique=[...new Set(expanded)].sort((a,b)=>rect(a).top-rect(b).top).slice(0,45);
    let layouts:Layout[]=[];let count=0;
    function emit(type:number,e:Element,why:string,columns?:number){
      const title=pattern(type);const heading=concise(e.querySelector('h1,h2,h3')?.textContent||'Untitled section');
      layouts=mergeLayout(layouts,{id:crypto.randomUUID(),type,title:title[0],category:title[1],included:true,reviewed:false,columns,sources:[source],evidence:[{page:source.url,heading,observation:why,position:Math.round(rect(e).top)}]});
    }
    for(const e of unique){
      const text=concise(e.textContent||'',7000),r=rect(e);if(text.length<12&&!e.querySelector('img,video'))continue;
      count++;
      const classText=[e,...e.querySelectorAll('[class]')].map(x=>x.getAttribute('class')||'').join(' ').toLowerCase();
      const heading=concise(e.querySelector('h1,h2,h3')?.textContent||'').toLowerCase();
      const imgs=[...e.querySelectorAll('img')].filter(visible),buttons=[...e.querySelectorAll('a,button,[role="button"]')].filter(visible),h1=e.querySelector('h1'),h2=e.querySelectorAll('h2'),forms=e.querySelector('form,input,textarea'),list=e.querySelector('ul,ol,.elementor-icon-list-items'),video=e.querySelector('video,[class*="video"],[data-widget_type*="video"]');
      const style=win.getComputedStyle(e),background=/url\(/.test(style.backgroundImage)||!!e.querySelector('[data-atlas-background]')||e.hasAttribute('data-atlas-background')||[...e.querySelectorAll('div')].slice(0,80).some(child=>{const cr=rect(child);return cr.width>r.width*.65&&cr.height>r.height*.45&&/url\(/.test(win.getComputedStyle(child).backgroundImage);});
      const contentImgs=imgs.filter(img=>rect(img).width>=r.width*.22&&rect(img).height>80).sort((a,b)=>rect(b).width*rect(b).height-rect(a).width*rect(a).height);
      const primaryImage=contentImgs[0]||imgs[0],imageRect=primaryImage?rect(primaryImage):null,textNode=e.querySelector('h1,h2,h3,p'),tr=textNode?rect(textNode):null;
      const side=imageRect&&tr&&Math.abs(imageRect.left-tr.left)>140&&Math.abs(imageRect.top-tr.top)<Math.max(280,r.height*.55);
      const repeated=[...e.querySelectorAll('[class*="grid"],[class*="row"],[class*="cards"],[class*="loop-container"]')].find(g=>g.children.length>=2);
      const cards=repeated?.children.length||imgs.length;
      if(forms){emit(16,e,'Form fields are paired with content or contact information.');continue;}
      if(/testimonial|review|blockquote/.test(classText)||e.querySelector('blockquote')||/testimonial|client perspective|clients say|reviews/.test(heading)){emit(13,e,'Quote or testimonial elements with attribution.');continue;}
      if(/image-carousel|logo.*(?:grid|slider|carousel)|(?:slider|carousel).*logo/.test(classText)||(/trusted|our clients|our partners|brands|logo/.test(heading)&&imgs.length>=3)){emit(14,e,`${imgs.length} image marks in a logo/carousel region.`);continue;}
      if(e.querySelector('[role="tablist"]')||/elementor-tabs|e-n-tabs|tab-content/.test(classText)){emit(21,e,'Tab navigation and associated content panels.');continue;}
      if(e.querySelector('details,[aria-expanded]')||/accordion|toggle-item/.test(classText)){emit(19,e,'Expandable question or disclosure elements.');continue;}
      if(/pricing|price-table|plan-card/.test(classText)||(/pricing|plans|choose.*plan/.test(heading)&&/\$|€|£|month|year/.test(text))){emit(20,e,'Parallel plan/price and feature structures.');continue;}
      if(/counter|statistic|stats-grid|number-widget/.test(classText)||(/numbers|statistics|at a glance|our impact/.test(heading)&&/\d/.test(text))){emit(18,e,'Repeated numeric counters with short labels.');continue;}
      if(/timeline|stepper|process-step/.test(classText)||(/how it works|our process|step by step/.test(heading)&&e.querySelectorAll('h3').length>=2)){emit(22,e,'Sequential steps or a timeline structure.');continue;}
      if(/team|leadership|our people/.test(heading)||/team-member|team-card/.test(classText)){emit(10,e,'Repeated portrait/profile cards with names or roles.');continue;}
      if(/post-grid|posts|loop-grid|blog-grid/.test(classText)||(e.querySelectorAll('article').length>=2)){emit(15,e,'Repeated article/post cards with titles and excerpts.');continue;}
      if((/questions|answers|faq/.test(heading))&&e.querySelectorAll('h3,h4').length>=2){emit(12,e,'Several question headings with visible answer copy.');continue;}
      if(h1){
        if(side)emit(2,e,'Page heading and image occupy separate side-by-side columns.');
        else if(imageRect&&tr&&imageRect.width>r.width*.65&&imageRect.bottom<=tr.top+80)emit(4,e,'A wide image appears above the main introductory heading.');
        else if(background)emit(3,e,'Page title appears in a region with a background image/gradient.');
        else emit(1,e,'A page title, introduction, and optional actions form a centered hero.');
        if(video)emit(5,e,'A wide media/video element accompanies the introduction.');
        continue;
      }
      if(video){emit(5,e,'A large embedded video or media element.');continue;}
      if(/gallery|masonry/.test(classText)&&imgs.length>=3){emit(23,e,`${imgs.length} images arranged in a gallery.`);continue;}
      if((/get started|let.?s work|ready to|contact us|next step|start.*project/.test(heading)||r.height<440)&&buttons.length===1&&imgs.length===0&&text.length<650){emit(17,e,'Short closing copy and a single action in a banner.');continue;}
      if(contentImgs.length===1&&/icon-list|icon-box/.test(classText)&&buttons.length>=3){emit(9,e,'One large image beside several icon-led links.');continue;}
      if(contentImgs.length>=2&&cards>=2){emit(11,e,`${contentImgs.length} linked visual cards in a repeated grid.`);continue;}
      if(side&&list){emit(7,e,'An image/text split contains a feature list and action.');continue;}
      if(side){
        const ratio=imageRect!.width/r.width;
        if(ratio<.37||/icon|illustration/.test(imgs[0]?.getAttribute('src')||'')||/svg|icon-box/.test(classText))emit(8,e,'A smaller visual sits beside a larger text column.');
        else emit(6,e,'Large image and descriptive text form two balanced columns.');
        continue;
      }
      if(/icon-box|icon-list/.test(classText)&&h2.length){emit(8,e,'Icon/illustration and heading/body content.');continue;}
      if(imgs.length===1){emit(6,e,'A single image accompanies descriptive content; verify orientation.');continue;}
      const columns=style.display==='grid'?Math.min(4,style.gridTemplateColumns.split(' ').length):Math.max(1,Math.min(4,repeated?.children.length||1));
      emit(24,e,`A ${columns}-column content section. Review and choose a more specific template if needed.`,columns);
    }
    return {layouts,sections:count,warning:count===0?'No readable sections were found. This site may need JavaScript rendering; import its rendered HTML.':undefined};
  }finally{iframe.remove();}
}
