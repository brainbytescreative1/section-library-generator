import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

const here=(path:string)=>fileURLToPath(new URL(path,import.meta.url));
export default defineConfig({
  root:here('./static-app'),
  publicDir:here('./public'),
  base:'/section-library-generator/',
  plugins:[react()],
  resolve:{alias:{'@':here('./')}},
  define:{__ATLAS_CRAWLER_URL__:JSON.stringify(process.env.ATLAS_CRAWLER_URL||'https://layout-atlas.brain-bytes-5762.chatgpt.site/api/page')},
  build:{outDir:here('./docs'),emptyOutDir:true},
});
