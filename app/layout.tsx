import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Cover the Codebase | Developer Dashboard', description: 'Learning, AI adoption and recognition for Sherwin-Williams developers.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
