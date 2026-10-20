import {readPublicPage,PageError} from '@/lib/fetch-page';
import {allowedCrawlerOrigin,crawlerHeaders} from '@/lib/crawler-origin';
export const dynamic='force-dynamic';
const recent=new Map<string,{count:number;reset:number}>();
export async function OPTIONS(request:Request){
  return new Response(null,{status:allowedCrawlerOrigin(request)?204:403,headers:crawlerHeaders(request)});
}
export async function POST(request:Request){
  const headers=crawlerHeaders(request);
  const json=(data:unknown,status=200)=>Response.json(data,{status,headers});
  if(!allowedCrawlerOrigin(request))return json({error:'Use this tool from its own website.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Expected a JSON request.'},415);
  const ip=request.headers.get('cf-connecting-ip')||'local',now=Date.now();
  if(recent.size>5000)for(const [key,value]of recent)if(value.reset<now)recent.delete(key);
  const slot=recent.get(ip);if(slot&&slot.reset>now&&slot.count>=65)return json({error:'The request limit was reached. Please wait a few minutes before starting another scan.'},429);
  recent.set(ip,slot&&slot.reset>now?{...slot,count:slot.count+1}:{count:1,reset:now+300000});
  try{
    if(Number(request.headers.get('content-length')||0)>4096)return json({error:'The request is too large.'},413);
    const text=await request.text();if(text.length>4096)return json({error:'The request is too large.'},413);
    const body=JSON.parse(text);if(typeof body.url!=='string')return json({error:'Enter a website URL.'},400);
    return json(await readPublicPage(body.url));
  }catch(e){if(e instanceof PageError)return json({error:e.message},e.status);console.error('Layout Atlas page read failed:',e instanceof Error?e.message:'Unknown failure');return json({error:'This website could not be read. Check the URL, try again, or import rendered HTML.'},502);}
}
