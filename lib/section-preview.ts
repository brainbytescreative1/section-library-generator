// A data-only drawing of measured section geometry. No source HTML, scripts,
// images, URLs, names, or copy are retained in the visual preview.
export type PreviewBox={kind:'panel'|'image'|'title'|'copy'|'button'|'input'|'icon';x:number;y:number;width:number;height:number;fill:string;color:string;radius:number;font:number;weight:number;align:'left'|'center'|'right';lines:number};
export type SectionPreview={width:number;height:number;boxes:PreviewBox[]};
const kinds=['panel','image','title','copy','button','input','icon'];
const number=(v:unknown,min:number,max:number,fallback=0)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
const color=(v:unknown,fallback:string)=>typeof v==='string'&&/^(#[\da-f]{3,8}|rgba?\([\d.,%\s]+\)|transparent|none)$/i.test(v)?v:fallback;
export function validatePreview(value:unknown):SectionPreview|undefined{
 const p=value as SectionPreview;if(!p||!Array.isArray(p.boxes)||!p.width||!p.height)return;
 const width=number(p.width,100,2000,1440),height=number(p.height,40,5000,600);
 const boxes=p.boxes.slice(0,220).filter(b=>b&&kinds.includes(b.kind)).map(b=>({kind:b.kind,x:number(b.x,-2000,2000),y:number(b.y,-5000,5000),width:number(b.width,1,2000,100),height:number(b.height,1,5000,50),fill:color(b.fill,'transparent'),color:color(b.color,'#233e35'),radius:number(b.radius,0,100),font:number(b.font,8,100,16),weight:number(b.weight,100,900,400),align:['left','center','right'].includes(b.align)?b.align:'left' as const,lines:number(b.lines,1,10,1)}));
 return boxes.length?{width,height,boxes}:undefined;
}
export function captureSection(element:Element,win:Window):SectionPreview{
 const root=element.getBoundingClientRect(),boxes:PreviewBox[]=[],height=Math.min(5000,Math.max(40,root.height));
 const rect=(e:Element)=>e.getBoundingClientRect();
 const add=(e:Element,kind:PreviewBox['kind'],fill?:string)=>{
  const r=rect(e),s=win.getComputedStyle(e),font=parseFloat(s.fontSize)||16;
  if(r.width<4||r.height<4||r.right<root.left||r.left>root.right||r.bottom<root.top||r.top>root.top+height||s.display==='none'||s.visibility==='hidden')return;
  boxes.push({kind,x:Math.round(r.left-root.left),y:Math.round(r.top-root.top),width:Math.round(Math.min(r.width,root.width)),height:Math.round(r.height),fill:fill??s.backgroundColor,color:s.color,radius:parseFloat(s.borderRadius)||0,font,weight:parseInt(s.fontWeight)||400,align:['center','right'].includes(s.textAlign)?s.textAlign as 'center'|'right':'left',lines:Math.max(1,Math.min(8,Math.round(r.height/(parseFloat(s.lineHeight)||font*1.4))))});
 };
 let visited=0;
 function walk(e:Element){
  if(++visited>900||boxes.length>=200)return;
  const r=rect(e),s=win.getComputedStyle(e),tag=e.tagName.toLowerCase();
  if(r.width<4||r.height<4||r.bottom<root.top||r.top>root.top+height||r.right<root.left||r.left>root.right||s.display==='none'||/^(script|style|header|footer|nav)$/.test(tag))return;
  const media=/^(img|video|iframe|svg|canvas)$/.test(tag),bg=s.backgroundImage!=='none'||e.hasAttribute('data-atlas-background');
  if(bg&&!media)add(e,'image','#526d61');
  else if(s.backgroundColor!=='rgba(0, 0, 0, 0)'&&s.backgroundColor!=='transparent')add(e,'panel');
  if(media){add(e,r.width<65&&r.height<65?'icon':'image','#dce5e4');return;}
  if(/^(input|select|textarea)$/.test(tag)){add(e,'input','#f8faf9');return;}
  const text=e.textContent?.trim()||'',direct=[...e.childNodes].some(n=>n.nodeType===3&&!!n.textContent?.trim());
  const atomic=/^h[1-6]$|^p$|^blockquote$|^label$/.test(tag)||(/^(a|button)$/.test(tag)&&!e.querySelector('h1,h2,h3,p,img,svg,div'));
  if(text&&(atomic||(direct&&!e.querySelector('h1,h2,h3,p,div,ul,ol')))){
   const action=/^(a|button)$/.test(tag)&&(s.backgroundColor!=='rgba(0, 0, 0, 0)'||s.borderStyle!=='none'||r.height>28);
   add(e,action?'button':/^h[1-6]$/.test(tag)?'title':'copy');
   return;
  }
  [...e.children].forEach(walk);
 }
 walk(element);
 return {width:Math.round(root.width),height:Math.round(height),boxes};
}
export function previewFingerprint(p:SectionPreview):string{
 const q=(n:number)=>Math.round(n/0.1)*0.1;
 const features=p.boxes.filter(b=>b.kind!=='panel'&&b.kind!=='copy').slice(0,18).map(b=>[b.kind,q(b.x/p.width),q(b.y/p.height),q(b.width/p.width),q(b.height/p.height)].join(','));
 return [Math.round(p.height/p.width*4),...features].join('|');
}
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderSectionPreview(input:SectionPreview):string{
 const p=validatePreview(input);if(!p)return '';
 const lorem='Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua';
 const content=p.boxes.map((b,index)=>{
  const attrs=`x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${Math.min(b.radius,b.height/2)}"`;
  if(b.kind==='panel')return `<rect ${attrs} fill="${esc(b.fill)}"/>`;
  if(b.kind==='image')return `<svg x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" viewBox="0 0 600 400" preserveAspectRatio="none"><rect width="600" height="400" fill="${esc(b.fill)}"/><circle cx="440" cy="95" r="35" fill="#c2d1ce" opacity=".5"/><path d="M0 400 175 145 340 400M220 400 425 200 600 400" fill="#b9cac5" opacity=".55"/></svg>`;
  if(b.kind==='icon')return `<rect ${attrs} fill="#c5d5d0"/><circle cx="${b.x+b.width/2}" cy="${b.y+b.height/2}" r="${Math.min(b.width,b.height)*.18}" fill="#738f83"/>`;
  if(b.kind==='input')return `<rect ${attrs} fill="#f8faf9" stroke="#bbc9c3"/><text x="${b.x+12}" y="${b.y+Math.min(b.height/2+5,24)}" font-size="14" fill="#70867c">Example field</text>`;
  const isButton=b.kind==='button',font=Math.min(b.font,b.height*.8),lineHeight=font*1.35,lines=isButton?1:Math.max(1,Math.min(b.kind==='title'?3:5,Math.floor(b.height/lineHeight)||1));
  // Placeholder images have different colors from the original photograph.
  // Choose contrasting text against the replacement rather than retaining white-on-white.
  const under=p.boxes.slice(0,index).filter(a=>(a.kind==='panel'||a.kind==='image')&&a.fill!=='transparent'&&a.fill!=='rgba(0, 0, 0, 0)'&&a.x<=b.x+b.width/2&&a.x+a.width>=b.x+b.width/2&&a.y<=b.y+b.height/2&&a.y+a.height>=b.y+b.height/2).pop();
  const background=isButton&&b.fill!=='rgba(0, 0, 0, 0)'?b.fill:under?.fill||'#ffffff';
  const channels=background.startsWith('#')?(background.length===4?background.slice(1).split('').map(c=>parseInt(c+c,16)):[1,3,5].map(i=>parseInt(background.slice(i,i+2),16))):(background.match(/[\d.]+/g)||['255','255','255']).slice(0,3).map(Number);
  const textColor=(channels[0]*.299+channels[1]*.587+channels[2]*.114)<145?'#ffffff':'#233e35';
  const words=(isButton?'Example action':b.kind==='title'?'A clear example headline goes here for this section':lorem+' '+lorem).split(' '),capacity=Math.max(5,Math.floor((b.width-(isButton?20:0))/(font*.54)));
  const rows:string[]=[];let row='';for(const word of words){if((row+' '+word).trim().length>capacity&&row){rows.push(row);row=word;}else row=(row+' '+word).trim();if(rows.length>=lines)break;}if(row&&rows.length<lines)rows.push(row);
  const x=b.align==='center'||isButton?b.x+b.width/2:b.align==='right'?b.x+b.width:b.x,anchor=b.align==='center'||isButton?'middle':b.align==='right'?'end':'start',y=isButton?b.y+b.height/2+font*.32:b.y+font;
  return `${isButton?`<rect ${attrs} fill="${b.fill==='rgba(0, 0, 0, 0)'?'#e5ede9':esc(b.fill)}" stroke="#b7c8bf"/>`:''}<svg x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" overflow="hidden"><text x="${x-b.x}" y="${y-b.y}" font-family="Arial,Helvetica,sans-serif" font-size="${font}" font-weight="${b.weight}" fill="${textColor}" text-anchor="${anchor}">${rows.map((s,i)=>`<tspan x="${x-b.x}" dy="${i?lineHeight:0}">${esc(s)}</tspan>`).join('')}</text></svg>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.width} ${p.height}" width="${p.width}" height="${p.height}" role="img" aria-label="Generic preview measured from the source section" style="display:block;width:100%;height:auto;background:#fff"><rect width="${p.width}" height="${p.height}" fill="#ffffff"/>${content}</svg>`;
}
