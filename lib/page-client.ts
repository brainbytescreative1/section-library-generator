export type FetchedPage={url:string;html:string;css:string[];warnings:string[]};
declare const __ATLAS_CRAWLER_URL__: string | undefined;
const crawlerURL=typeof __ATLAS_CRAWLER_URL__==='string'?__ATLAS_CRAWLER_URL__:'/api/page';

export async function fetchPage(url:string,signal?:AbortSignal):Promise<FetchedPage>{
  const response=await fetch(crawlerURL,{method:'POST',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url.trim()}),signal});
  const data=await response.json() as FetchedPage & {error?:string};
  if(!response.ok)throw new Error(data.error||'This page could not be read.');
  if(typeof data.url!=='string'||typeof data.html!=='string'||!Array.isArray(data.css)||!Array.isArray(data.warnings))throw new Error('The website reader returned an invalid response. Please try again.');
  return data;
}
