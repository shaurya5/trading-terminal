import type { Metadata } from 'next';
import { JetBrains_Mono, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Trade Terminal',
  description: 'Professional trading terminal with real-time market data',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
