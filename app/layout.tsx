import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Cover the Codebase | SW AI Adoption Scoreboard',
  description:
    'Sherwin-Williams developer enablement, adoption, learning and recognition scoreboard.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
