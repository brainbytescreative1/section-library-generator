import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {mkdir,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const dir=path.resolve('.sites-runtime/atlas-tests');await mkdir(dir,{recursive:true});
const exports={};
for(const name of ['model','presentation','fetch-page']){
 const out=path.join(dir,name+'.mjs');await build({entryPoints:[`lib/${name}.ts`],outfile:out,bundle:true,platform:'node',format:'esm',logLevel:'silent'});exports[name]=await import(pathToFileURL(out).href);
}
const {safeUrl}=exports['fetch-page'];
for(const url of ['http://localhost/','http://127.0.0.1/','http://0x7f000001/','http://[::1]/','http://192.168.1.2/','http://example.local/','https://user:secret@example.com','file:///etc/passwd','http://example.com:8080/'])assert.throws(()=>safeUrl(url),undefined,url);
assert.equal(safeUrl('mediavenue.com').href,'https://mediavenue.com/');
const {validateProject,mergeLayout}=exports.model;
const p=validateProject({version:1,url:'https://example.com/',title:'<script>alert(1)</script>',pages:[{url:'https://example.com/',title:'Home',status:'done'}],layouts:[{type:2,title:'<img onerror=alert(1)>',included:true,sources:[{url:'javascript:alert(1)',title:'unsafe'},{url:'https://example.com/about',title:'About <&>'}],evidence:[]}]});
assert.equal(p.layouts[0].sources.length,1);assert.equal(p.layouts[0].reviewed,false);
const merged=mergeLayout(p.layouts,{...p.layouts[0],id:'second',sources:[{url:'https://example.com/contact',title:'Contact'}]});assert.equal(merged.length,1);assert.equal(merged[0].sources.length,2);
const standalone=exports.presentation.exportPresentation(p);assert(standalone.startsWith('<!doctype html>'));assert(!standalone.includes('<img onerror=alert(1)>'));assert(standalone.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert(!standalone.includes('href="javascript:'));
const embed=exports.presentation.exportPresentation(p,true);assert(!embed.includes('<!doctype html>'));assert(embed.includes('id="mv-layout-library"'));assert(embed.includes('rel="noopener noreferrer"'));
for(let i=1;i<=24;i++){const html=exports.presentation.previewDocument(i);assert(html.includes('mv-layout-library'));assert(html.length>500,'Template '+i);}
console.log('PASS: URL restrictions, project validation, layout merging, safe HTML exports, Elementor embed, and all 24 template renders.');
