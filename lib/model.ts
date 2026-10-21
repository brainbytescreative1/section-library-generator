import {SectionPreview,validatePreview,previewFingerprint} from './section-preview';
export type PageSource = { url: string; title: string };
export type Evidence = { page: string; heading: string; observation: string; position: number };
export type Layout = {
  id: string; type: number; title: string; category: string; included: boolean;
  reviewed: boolean; sources: PageSource[]; evidence: Evidence[];
  columns?: number;
  preview?: SectionPreview;
};
export type ScanPage = PageSource & { selected: boolean; status: 'ready' | 'fetching' | 'done' | 'failed'; message?: string; sections?: number };
export type Project = { version: 1; id: string; url: string; title: string; createdAt: string; layouts: Layout[]; pages: ScanPage[]; sample?: boolean };
export const PATTERNS = [
  ['Centered hero with buttons','Hero','Centered introduction, supporting copy, and two actions.'],
  ['Split hero','Hero','Headline and introduction beside a large image.'],
  ['Photo-background hero','Hero','Centered introduction over a full-width background.'],
  ['Photo above centered introduction','Hero','Wide image followed by a centered introduction panel.'],
  ['Wide video / media feature','Media','A rounded, full-width frame for a visual story.'],
  ['Photo and text split','Content','Two balanced columns with an image and body copy.'],
  ['Service summary panel','Content','Photo and text panel with a feature list and action.'],
  ['Illustration and text row','Content','A small illustration beside a larger text column.'],
  ['Photo with stacked service links','Content','Heading and photo beside a vertical collection of links.'],
  ['Team profile cards','Cards','Portrait cards with names, roles, and biography links.'],
  ['Image-link card grid','Cards','Image cards with short linked captions.'],
  ['Question-and-answer cards','Cards','Side-by-side questions with fully visible answers.'],
  ['Testimonial carousel','Proof','A quote, attribution, and slide navigation.'],
  ['Client logo carousel','Proof','Horizontal rows of organization marks.'],
  ['Filterable article grid','Cards','Article cards with category filters and pagination.'],
  ['Contact form with information and map','Form','A form beside contact details and a location map.'],
  ['Call-to-action banner','Call to action','A short closing headline and a single action.'],
  ['Statistics row','Proof','Large numbers and short captions in equal columns.'],
  ['FAQ accordion','Content','A vertical list of expandable questions.'],
  ['Pricing comparison','Cards','Parallel pricing cards with features and actions.'],
  ['Tabbed content','Content','Several content panels sharing a tab navigation.'],
  ['Process / timeline','Content','A sequence of numbered steps with descriptions.'],
  ['Image gallery','Media','A multi-image composition for visual content.'],
  ['Custom column section','Content','A generic column layout for an unclassified section.'],
] as const;
export const pattern = (type: number) => PATTERNS[Math.max(0,Math.min(PATTERNS.length-1,type-1))];
export function publicHref(input: string): string | null {
  try { const u=new URL(input); if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null; return u.href; } catch { return null; }
}
export function mergeLayout(list: Layout[], incoming: Layout): Layout[] {
  const existing=list.find(l=>l.type===incoming.type&&(l.type!==24||l.columns===incoming.columns)&&
    (incoming.preview&&l.preview?previewFingerprint(incoming.preview)===previewFingerprint(l.preview):!incoming.preview&&!l.preview));
  if(!existing)return [...list,incoming];
  return list.map(l=>l!==existing?l:{...l,sources:[...new Map([...l.sources,...incoming.sources].map(s=>[s.url,s])).values()],evidence:[...l.evidence,...incoming.evidence].slice(0,100)});
}
export function sameWebsite(a:string,b:string){try{return new URL(a).hostname.replace(/^www\./,'')===new URL(b).hostname.replace(/^www\./,'');}catch{return false;}}
export function validateProject(value: unknown): Project {
  const p=value as Project;
  if(!p||p.version!==1||typeof p.title!=='string'||!Array.isArray(p.layouts)||!Array.isArray(p.pages)||!publicHref(p.url))throw new Error('Choose a Layout Atlas project JSON file.');
  return {version:1,id:crypto.randomUUID(),url:publicHref(p.url)!,title:p.title.slice(0,120),createdAt:typeof p.createdAt==='string'?p.createdAt:new Date().toISOString(),sample:!!p.sample,
    pages:p.pages.slice(0,24).filter(s=>publicHref(s.url)&&sameWebsite(s.url,p.url)).map(s=>({url:publicHref(s.url)!,title:String(s.title||'Page').slice(0,100),selected:!!s.selected,status:['ready','done','failed'].includes(s.status)?s.status as 'ready'|'done'|'failed':'ready',sections:typeof s.sections==='number'?s.sections:undefined,message:typeof s.message==='string'?s.message.slice(0,500):undefined})),
    layouts:p.layouts.slice(0,100).map((l,i)=>{const type=Number.isInteger(l.type)&&l.type>=1&&l.type<=24?l.type:24;return {id:crypto.randomUUID(),type,title:String(l.title||pattern(type)[0]).slice(0,120),category:pattern(type)[1],included:l.included!==false,reviewed:!!l.reviewed,preview:validatePreview(l.preview),columns:Math.max(1,Math.min(4,Number(l.columns)||2)),sources:(Array.isArray(l.sources)?l.sources:[]).slice(0,30).filter(s=>publicHref(s.url)&&sameWebsite(s.url,p.url)).map(s=>({url:publicHref(s.url)!,title:String(s.title||'Source page').slice(0,120)})),evidence:(Array.isArray(l.evidence)?l.evidence:[]).slice(0,100).filter(e=>publicHref(e.page)&&sameWebsite(e.page,p.url)).map(e=>({page:publicHref(e.page)!,heading:String(e.heading||'').slice(0,160),observation:String(e.observation||'').slice(0,500),position:Number(e.position)||i}))};})};
}
