import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/navigation/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sortwise | AI-Assisted Complaint Management & Quality Intelligence',
  description:
    'Full-stack quality operations platform with evidence preservation, risk-based triage, duplicate detection, root-cause analysis, and auditable CAPA workflows.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-50 text-slate-900`}>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-700">Sortwise Quality Intelligence</span> · Auditable lifecycle management for medical devices & pharmaceuticals
            </div>
            <div className="flex items-center space-x-4 text-[11px] text-slate-400">
              <span>FDA QMSR 21 CFR 820</span>
              <span>21 CFR 211.198</span>
              <span>ISO 13485:2016</span>
              <span>21 CFR Part 11 Audit Trail</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

