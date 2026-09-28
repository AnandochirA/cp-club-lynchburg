import type { Metadata, Viewport } from 'next';
import { Big_Shoulders, Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import { club } from '@/lib/content';
import { RevealObserver } from '@/components/motion/RevealObserver';
import './globals.css';
import './motion.css';

/** Scoreboard capitals: headlines, numerals, names. Condensed, so it needs to run large. */
const shoulders = Big_Shoulders({
  subsets: ['latin'],
  // Variable weight AND optical size: the browser picks the display cut at large sizes.
  weight: 'variable',
  axes: ['opsz'],
  variable: '--font-shoulders',
  display: 'swap',
  // Next has no fallback metrics for this family, so it can't size-match a fallback; say so instead of warning.
  adjustFontFallback: false,
});

const instrument = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-instrument',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${club.name} Club · ${club.school}`,
  description:
    'Get interview-ready. Have fun doing it. A competitive programming club at the University of Lynchburg — beginners very welcome.',
  openGraph: {
    title: `${club.name} Club · ${club.school}`,
    description: 'Get interview-ready. Have fun doing it. Beginners very welcome.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0C10',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${shoulders.variable} ${instrument.variable} ${jetbrains.variable}`}
      // The inline script below adds `js` before paint; React must not treat that as a mismatch.
      suppressHydrationWarning
    >
      <head>
        {/* Reveal animations only hide content once we know JavaScript will bring it back. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        {children}
        <RevealObserver />
      </body>
    </html>
  );
}
