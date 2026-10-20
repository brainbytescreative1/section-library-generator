// Bounded public-page reads. Visitor cookies and authentication are never forwarded.
const MAX_HTML=2_000_000, MAX_CSS=260_000;
const agent='LayoutAtlas/1.0 (+public layout reference builder)';
export class PageError extends Error { constructor(message:string,public status=400){super(message);} }
export function safeUrl(input: string) {
  let url:URL;try{url=new URL(input.includes('://')?input:'https://'+input);}catch{throw new PageError('Enter a complete public website URL.');}
  const h=url.hostname.toLowerCase().replace(/\.$/,'');
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.href.length>2048||(url.port&&!['80','443'].includes(url.port))||!h.includes('.')||/^[\d.]+$/.test(h)||h.includes(':')||h.includes('[')||/\.(local|localhost|internal|lan|home|test|invalid|example)$/.test(h)||h==='localhost'||h==='metadata.google.internal')throw new PageError('Use a public HTTP or HTTPS domain, without credentials or a custom port.');
  url.hash='';url.hostname=h;return url;
}
function publicIP(ip:string) {
  if(ip.includes(':'))return /^[23][0-9a-f]{3}:/i.test(ip)&&!/^2001:(?:db8|0*:|1[0-9a-f]:)/i.test(ip)&&!/^2002:/i.test(ip);
  const v=ip.split('.').map(Number);if(v.length!==4||v.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
  return !([0,10,127].includes(v[0])||v[0]>=224||(v[0]===169&&v[1]===254)||(v[0]===172&&v[1]>=16&&v[1]<=31)||(v[0]===192&&(v[1]===168||v[1]===0||v[1]===2))||(v[0]===100&&v[1]>=64&&v[1]<=127)||(v[0]===198&&[18,19,51].includes(v[1]))||(v[0]===203&&v[1]===0));
}
function timeout(ms:number){return AbortSignal.timeout(ms);}
type ReadContext={dns:Map<string,Promise<void>>;deadline:number};
async function checkDNS(url:URL,ctx:ReadContext){
  if(!ctx.dns.has(url.hostname))ctx.dns.set(url.hostname,(async()=>{
    const answers=await Promise.all(['A','AAAA'].map(async type=>{
      const r=await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(url.hostname)}&type=${type}`,{headers:{accept:'application/dns-json'},signal:timeout(4500)});
      if(!r.ok)throw new PageError('The domain could not be verified. Try again shortly.',502);
      const data=await r.json() as {Answer?:{type:number;data:string}[]};return (data.Answer||[]).filter(a=>a.type===1||a.type===28).map(a=>a.data);
    }));
    const ips=answers.flat();if(!ips.length)throw new PageError('This domain has no public address.',400);
    if(ips.some(ip=>!publicIP(ip)))throw new PageError('Only publicly reachable websites can be analyzed.',400);
  })());
  await ctx.dns.get(url.hostname);
}
async function get(url:URL,ctx:ReadContext,kind:'html'|'css'|'text',limit:number):Promise<{text:string;url:string;status:number}>{
  for(let redirects=0;redirects<5;redirects++){
    if(Date.now()>ctx.deadline)throw new PageError('The website took too long to respond. Try fewer pages or import rendered HTML.',504);
    safeUrl(url.href);await checkDNS(url,ctx);
    const r=await fetch(url.href,{redirect:'manual',headers:{'User-Agent':agent,'Accept':kind==='html'?'text/html,application/xhtml+xml':kind==='css'?'text/css,*/*;q=0.1':'text/plain,*/*;q=0.1'},signal:timeout(Math.max(1000,Math.min(9000,ctx.deadline-Date.now())))});
    if([301,302,303,307,308].includes(r.status)){const location=r.headers.get('location');await r.body?.cancel();if(!location)throw new PageError('The website returned an incomplete redirect.',502);url=safeUrl(new URL(location,url).href);continue;}
    if(kind==='html'&&!r.ok){await r.body?.cancel();throw new PageError(r.status===403||r.status===429?'This site limits automated access. You can import its rendered HTML instead.':`This page returned HTTP ${r.status}.`,422);}
    if(!r.ok){await r.body?.cancel();return {text:'',url:url.href,status:r.status};}
    const ct=r.headers.get('content-type')||'';
    if(kind==='html'&&!/text\/html|application\/xhtml\+xml/i.test(ct)){await r.body?.cancel();throw new PageError('This URL does not return a web page. Choose an HTML page.',422);}
    if(Number(r.headers.get('content-length')||0)>limit){await r.body?.cancel();throw new PageError('The page is too large to analyze in one request.',413);}
    const reader=r.body?.getReader();if(!reader)return {text:'',url:url.href,status:r.status};
    const chunks:Uint8Array[]=[];let bytes=0;
    while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>limit){await reader.cancel();throw new PageError('The page exceeds the analysis size limit.',413);}chunks.push(part.value);}
    const output=new Uint8Array(bytes);let offset=0;for(const c of chunks){output.set(c,offset);offset+=c.length;}
    return {text:new TextDecoder().decode(output),url:url.href,status:r.status};
  }
  throw new PageError('This page has too many redirects.',422);
}
function allowedByRobots(text:string,path:string){
  const groups:{agents:string[];rules:{allow:boolean;path:string}[]}[]=[];let group={agents:[] as string[],rules:[] as {allow:boolean;path:string}[]};
  for(const line of text.split(/\r?\n/)){const match=line.replace(/#.*/,'').match(/^\s*(user-agent|allow|disallow)\s*:\s*(.*?)\s*$/i);if(!match)continue;const key=match[1].toLowerCase(),value=match[2];if(key==='user-agent'){if(group.rules.length){groups.push(group);group={agents:[],rules:[]};}group.agents.push(value.toLowerCase());}else if(value&&group.agents.length)group.rules.push({allow:key==='allow',path:value});}groups.push(group);
  const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&agent.toLowerCase().includes(a))),rules=(specific.length?specific:groups.filter(g=>g.agents.includes('*'))).flatMap(g=>g.rules);
  const matches=rules.filter(r=>{try{return new RegExp('^'+r.path.split('*').map(p=>p.replace(/[.+?^${}()|[\]\\]/g,'\\$&')).join('.*').replace(/\\\$$/,'$')).test(path);}catch{return path.startsWith(r.path);}}).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
  return !matches.length||matches[0].allow;
}
function cssLinks(html:string,base:string){
  const links=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).filter(s=>/\brel\s*=\s*["'][^"']*stylesheet/i.test(s)).map(s=>s.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]).filter(Boolean) as string[];
  const unique=[...new Set(links.map(s=>{try{return new URL(s.replace(/&amp;/g,'&'),base).href;}catch{return '';}}).filter(Boolean))];
  const ids=[...html.matchAll(/data-elementor-id=["'](\d+)["']/g)].map(m=>m[1]);
  const priority=(url:string)=>ids.some(id=>url.includes(`/post-${id}.css`))?30:/uploads\/elementor\/css\/post-/i.test(url)?20:/frontend(?:-lite)?(?:\.min)?\.css|bootstrap/i.test(url)?15:/\/style(?:\.min)?\.css|global|theme|widget-/i.test(url)?10:/font|icon|awesome/i.test(url)?0:3;
  const selected=[...unique].sort((a,b)=>priority(b)-priority(a)).slice(0,12);
  return selected.sort((a,b)=>unique.indexOf(a)-unique.indexOf(b));
}
export async function readPublicPage(input:string){
  const url=safeUrl(input),ctx:ReadContext={dns:new Map(),deadline:Date.now()+25000};
  let robotsNote='';
  try{const robots=await get(new URL('/robots.txt',url),ctx,'text',120000);if(robots.status===200&&!allowedByRobots(robots.text,url.pathname+url.search))throw new PageError('This website’s robots.txt does not allow this page to be read automatically. Import rendered HTML to review a page you can access.',403);}catch(e){if(e instanceof PageError&&e.status===403)throw e;robotsNote='robots.txt could not be checked.';}
  const page=await get(url,ctx,'html',MAX_HTML),css:string[]=[],warnings:string[]=[];
  if(robotsNote)warnings.push(robotsNote);
  const links=cssLinks(page.text,page.url);let missed=0;
  for(let i=0;i<links.length;i+=3){await Promise.all(links.slice(i,i+3).map(async (link,j)=>{try{const sheet=await get(safeUrl(link),ctx,'css',MAX_CSS);if(sheet.text)css[i+j]=sheet.text;else missed++;}catch{missed++;}}));}
  if(missed)warnings.push(`${missed} stylesheet${missed===1?' was':'s were'} unavailable; some layout measurements may be approximate.`);
  if(/<script[^>]+src[^>]*(?:_next|bundle|app)[^>]*>/i.test(page.text)&&!/<(?:h1|h2|section)\b/i.test(page.text))warnings.push('This page may depend on JavaScript. Import rendered HTML if important sections are missing.');
  return {url:page.url,html:page.text,css:css.filter(Boolean),warnings};
}
