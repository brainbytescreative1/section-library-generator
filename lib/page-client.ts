export type FetchedPage={url:string;html:string;css:string[];warnings:string[]};
import {sameWebsite} from './model';
declare const __ATLAS_CRAWLER_URL__: string | undefined;
const crawlerURL=typeof __ATLAS_CRAWLER_URL__==='string'?__ATLAS_CRAWLER_URL__:'/api/page';

export async function fetchPage(url:string,signal?:AbortSignal):Promise<FetchedPage>{
  const response=await fetch(crawlerURL,{method:'POST',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url.trim()}),signal});
  const data=await response.json() as FetchedPage & {error?:string};
  if(!response.ok)throw new Error(data.error||'This page could not be read.');
  if(typeof data.url!=='string'||typeof data.html!=='string'||!Array.isArray(data.css)||!Array.isArray(data.warnings))throw new Error('The website reader returned an invalid response. Please try again.');
  const requested=/^https?:\/\//i.test(url.trim())?url.trim():'https://'+url.trim();
  if(!sameWebsite(requested,data.url))throw new Error('This address redirected to a different website. Enter the destination website URL explicitly to scan it.');
  return data;
}
