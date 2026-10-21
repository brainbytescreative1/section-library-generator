import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Site Atlas — Map your next move',description:'Crawl a website, map its navigation and discover reusable layouts for your next platform.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
