import test from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY,restoreAudit,verifyCrawlResponse,websiteURL} from '../lib/audit-session.mjs';
const target='https://aloha-orthodontics.com/';
const request={runId:'aloha-run',url:target,origin:new URL(target).origin};
const response={...request,requestedUrl:target,title:'Aloha Orthodontics',links:[],features:['section:9']};
const audit={mode:'live',site:target,origin:request.origin,runId:request.runId,startedAt:'2026-10-21T03:00:00Z',pages:[response],nav:[],errors:[],queue:[]};
const storage=entries=>({getItem:key=>entries[key]||null});
test('a saved v1 sample cannot restore into a live audit',()=>{
 assert.equal(restoreAudit(storage({'site-atlas-v1':JSON.stringify({demo:true,site:'https://example.com',pages:[{title:'Our solutions'}]})})),null);
});
test('restores live audits only when every URL belongs to its target',()=>{
 assert.equal(restoreAudit(storage({[STORAGE_KEY]:JSON.stringify(audit)})).site,target);
 assert.equal(restoreAudit(storage({[STORAGE_KEY]:JSON.stringify({...audit,pages:[{url:'https://example.com/'}]})})),null);
 assert.equal(restoreAudit(storage({[STORAGE_KEY]:JSON.stringify({...audit,mode:'demo'})})),null);
});
test('a response for an old run or other website is rejected',()=>{
 assert.equal(verifyCrawlResponse(response,request).title,'Aloha Orthodontics');
 assert.throws(()=>verifyCrawlResponse({...response,runId:'previous-run'},request));
 assert.throws(()=>verifyCrawlResponse({...response,url:'https://example.com/'},request));
 assert.throws(()=>verifyCrawlResponse({...response,requestedUrl:'https://example.com/'},request));
 assert.throws(()=>verifyCrawlResponse({title:'Cached sample'},request));
});
test('sitemap responses cannot introduce another origin',()=>{
 const r={...request,action:'discover'};
 assert.throws(()=>verifyCrawlResponse({...response,urls:['https://example.com/about'],notes:[]},r));
});
test('bare domain and surrounding whitespace are normalized',()=>{
 assert.equal(websiteURL(' aloha-orthodontics.com '),target);
 assert.throws(()=>websiteURL(''));
 assert.throws(()=>websiteURL('ftp://aloha-orthodontics.com'));
});
