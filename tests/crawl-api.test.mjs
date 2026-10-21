import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const path=new URL('../app/api/crawl/route.ts',import.meta.url);
const code=fs.readFileSync(path,'utf8').replace("'../../../lib/analyze.mjs'",JSON.stringify(new URL('../lib/analyze.mjs',import.meta.url).href));
const compiled=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
async function call(url,runId,action){const r=await POST(new Request('https://atlas.example/api/crawl',{method:'POST',body:JSON.stringify({url,origin:new URL(url).origin,runId,action})}));return {r,data:await r.json()}}
test('different websites return distinct page evidence bound to the requested run',async()=>{
 const original=global.fetch;global.fetch=async url=>{
  const u=new URL(url);if(u.pathname==='/robots.txt')return new Response('Crawl-delay: 10\nUser-agent: *\nDisallow: /private');
  if(u.pathname==='/sitemap.xml')return new Response(`<urlset><url><loc>${u.origin}/about/</loc></url></urlset>`);
  const aloha=u.hostname==='aloha-orthodontics.com';
  return new Response(`<title>${aloha?'Aloha Orthodontics':'Other website'}</title><nav><a href="${aloha?'/dr-naren-chelian/':'/products/'}">${aloha?'Meet Dr. C':'Products'}</a></nav><main>${aloha?'<section class="hero"><h1>Aloha</h1></section>':'<article><h1>Other</h1></article>'}</main>`,{headers:{'content-type':'text/html'}});
 };
 try{
  const a=await call('https://aloha-orthodontics.com/','run-aloha'),b=await call('https://other.example/','run-other');
  assert.equal(a.r.status,200);assert.equal(a.data.title,'Aloha Orthodontics');assert.equal(a.data.links[0].label,'Meet Dr. C');assert.equal(a.data.runId,'run-aloha');assert.equal(a.data.requestedUrl,'https://aloha-orthodontics.com/');assert.equal(a.data.crawlDelayMs,10000);assert.match(a.r.headers.get('cache-control'),/no-store/);
  assert.notEqual(a.data.signature,b.data.signature);assert.equal(b.data.title,'Other website');assert.equal(b.data.origin,'https://other.example');
  const discovery=await call('https://aloha-orthodontics.com/','run-aloha','discover');assert.deepEqual(discovery.data.urls,['https://aloha-orthodontics.com/about/']);assert.equal(discovery.data.runId,'run-aloha');
  const blocked=await call('https://aloha-orthodontics.com/private','run-aloha');assert.equal(blocked.r.status,403);assert.equal(blocked.data.error,'Blocked by robots.txt');assert.equal(blocked.data.title,undefined);
  global.fetch=async()=>{throw new Error('Network unavailable')};const failed=await call('https://aloha-orthodontics.com/','run-new');assert.equal(failed.r.status,400);assert.match(failed.data.error,/Network unavailable/);assert.equal(failed.data.title,undefined);assert.equal(failed.data.runId,'run-new');
 }finally{global.fetch=original}
});
