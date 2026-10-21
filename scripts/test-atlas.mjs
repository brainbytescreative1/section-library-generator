import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {mkdir,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const dir=path.resolve('.sites-runtime/atlas-tests');await mkdir(dir,{recursive:true});
const exports={};
for(const name of ['model','presentation','fetch-page','crawler-origin','page-client','section-preview']){
 const out=path.join(dir,name+'.mjs');await build({entryPoints:[`lib/${name}.ts`],outfile:out,bundle:true,platform:'node',format:'esm',logLevel:'silent'});exports[name]=await import(pathToFileURL(out).href);
}
const {safeUrl}=exports['fetch-page'];
// Switching websites must submit the new URL; failures must never load sample data.
const originalFetch=globalThis.fetch,requests=[];
try{
 globalThis.fetch=async (_endpoint,init)=>{const {url}=JSON.parse(init.body);requests.push({url,cache:init.cache});return Response.json({url,html:`<h1>${url}</h1>`,css:[],warnings:[]});};
 const client=exports['page-client'];
 await client.fetchPage('https://mediavenue.com/');
 const aloha=await client.fetchPage(' https://aloha-orthodontics.com/ ');
 assert.equal(aloha.url,'https://aloha-orthodontics.com/');
 assert.deepEqual(requests.map(r=>r.url),['https://mediavenue.com/','https://aloha-orthodontics.com/']);
 assert(requests.every(r=>r.cache==='no-store'));
 globalThis.fetch=async()=>Response.json({error:'Site unavailable'},{status:422});
 await assert.rejects(client.fetchPage('https://aloha-orthodontics.com/'),/Site unavailable/);
 globalThis.fetch=async()=>Response.json({layouts:[]});
 await assert.rejects(client.fetchPage('https://aloha-orthodontics.com/'),/invalid response/);
 globalThis.fetch=async()=>Response.json({url:'https://mediavenue.com/',html:'old site',css:[],warnings:[]});
 await assert.rejects(client.fetchPage('https://aloha-orthodontics.com/'),/different website/);
}finally{globalThis.fetch=originalFetch;}
const {allowedCrawlerOrigin,crawlerHeaders,GITHUB_PAGES_ORIGIN}=exports['crawler-origin'];
for(const origin of [GITHUB_PAGES_ORIGIN,'https://atlas.example']){
 const request=new Request('https://atlas.example/api/page',{headers:{origin}});
 assert(allowedCrawlerOrigin(request));
 assert.equal(crawlerHeaders(request)['Access-Control-Allow-Origin'],origin===GITHUB_PAGES_ORIGIN?origin:undefined);
}
for(const origin of ['https://evil.example','https://brainbytescreative1.github.io.evil.example','null']){
 const request=new Request('https://atlas.example/api/page',{headers:{origin}});
 assert.equal(allowedCrawlerOrigin(request),false);
 assert.equal(crawlerHeaders(request)['Access-Control-Allow-Origin'],undefined);
}
for(const url of ['http://localhost/','http://127.0.0.1/','http://0x7f000001/','http://[::1]/','http://192.168.1.2/','http://example.local/','https://user:secret@example.com','file:///etc/passwd','http://example.com:8080/'])assert.throws(()=>safeUrl(url),undefined,url);
assert.equal(safeUrl('mediavenue.com').href,'https://mediavenue.com/');
const {validateProject,mergeLayout}=exports.model;
const section={width:1440,height:700,boxes:[{kind:'title',x:50,y:50,width:600,height:100,font:40,weight:700,fill:'transparent',color:'#233e35',radius:0,align:'left',lines:2},{kind:'image',x:800,y:20,width:550,height:600,font:16,weight:400,fill:'#dce5e4',color:'#233e35',radius:20,align:'left',lines:1}]};
const mirrored={...section,boxes:section.boxes.map(b=>({...b,x:1440-b.x-b.width}))};
const snapshotLayout={id:'one',type:6,title:'Source split',category:'Content',included:true,reviewed:false,sources:[{url:'https://aloha-orthodontics.com/about/',title:'About'}],evidence:[],preview:section};
assert.equal(mergeLayout([snapshotLayout],{...snapshotLayout,id:'two',preview:mirrored}).length,2,'Different compositions must remain separate');
assert.equal(mergeLayout([snapshotLayout],{...snapshotLayout,id:'same'}).length,1);
const imported=validateProject({version:1,title:'Aloha',url:'https://aloha-orthodontics.com/',layouts:[{...snapshotLayout,sources:[...snapshotLayout.sources,{url:'https://mediavenue.com/',title:'Old site'}]}],pages:[{url:'https://mediavenue.com/',title:'Old site'},{url:'https://aloha-orthodontics.com/',title:'Home'}]});
assert.equal(imported.pages.length,1);assert.equal(imported.layouts[0].sources.length,1);assert(imported.layouts[0].preview);
const drawing=exports['section-preview'].renderSectionPreview(section);
assert(drawing.includes('viewBox="0 0 1440 700"'));assert(drawing.includes('A clear example'));assert(!drawing.includes('mediavenue'));
const snapshotExport=exports.presentation.exportPresentation(imported);assert(snapshotExport.includes('viewBox="0 0 1440 700"'));assert(!snapshotExport.includes('https://mediavenue.com/'));
const invalidDrawing=exports['section-preview'].renderSectionPreview({...section,boxes:[{...section.boxes[0],color:'url(https://evil.example/image)',font:NaN}]});assert(!invalidDrawing.includes('evil.example'));assert(!invalidDrawing.includes('NaN'));
const p=validateProject({version:1,url:'https://example.com/',title:'<script>alert(1)</script>',pages:[{url:'https://example.com/',title:'Home',status:'done'}],layouts:[{type:2,title:'<img onerror=alert(1)>',included:true,sources:[{url:'javascript:alert(1)',title:'unsafe'},{url:'https://example.com/about',title:'About <&>'}],evidence:[]}]});
assert.equal(p.layouts[0].sources.length,1);assert.equal(p.layouts[0].reviewed,false);
const merged=mergeLayout(p.layouts,{...p.layouts[0],id:'second',sources:[{url:'https://example.com/contact',title:'Contact'}]});assert.equal(merged.length,1);assert.equal(merged[0].sources.length,2);
const standalone=exports.presentation.exportPresentation(p);assert(standalone.startsWith('<!doctype html>'));assert(!standalone.includes('<img onerror=alert(1)>'));assert(standalone.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert(!standalone.includes('href="javascript:'));
const embed=exports.presentation.exportPresentation(p,true);assert(!embed.includes('<!doctype html>'));assert(embed.includes('id="mv-layout-library"'));assert(embed.includes('rel="noopener noreferrer"'));
for(let i=1;i<=24;i++){const html=exports.presentation.previewDocument(i);assert(html.includes('mv-layout-library'));assert(html.length>500,'Template '+i);}
console.log('PASS: URL restrictions, project validation, layout merging, safe HTML exports, Elementor embed, and all 24 template renders.');
