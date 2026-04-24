import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LiveTickerBar from "@/components/LiveTickerBar";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://sportbetizer.vercel.app'),
  title: "MilesRunsAI Sportsbetalizer",
  description: "3 AI Models. 1 Daily Multi. Real Money.",
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'MilesRunsAI Sportsbetalizer',
    description: '3 AI Models. 1 Daily Multi. Real Money.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MilesRunsAI Sportsbetalizer',
    description: '3 AI Models. 1 Daily Multi. Real Money.',
    images: ['/og-image.jpg'],
  },
};


function Header() {
  return (
    <header className="bg-[#003f7f] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="MilesRunsAI" width={140} height={32} className="h-8 w-auto" priority />
        </Link>

        <div className="hidden sm:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search events, races, sports..."
              className="w-full bg-white/15 text-white placeholder-white/50 text-[13px] rounded-md px-4 py-2 outline-none border border-white/20 focus:border-white/40"
              readOnly
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <nav className="hidden md:flex items-center gap-1 text-[13px]">
            <Link href="/" className="px-3 py-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors">
              Today
            </Link>
            <Link href="/aipicks" className="px-3 py-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors">
              AI Picks
            </Link>
            <Link href="/results" className="px-3 py-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors">
              Track Record
            </Link>
            <Link href="/how-it-works" className="px-3 py-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors">
              How It Works
            </Link>
          </nav>
          <Link
            href="/aipicks"
            className="bg-[#f47920] hover:bg-[#e06810] text-white text-[13px] font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            AI Multi
          </Link>
        </div>
      </div>
    </header>
  );
}

function CategoryBar() {
  const categories = [
    { label: 'Horses', icon: '\u{1F3C7}', href: '/analysis?sport=Racing' },
    { label: 'Greyhounds', icon: '\u{1F415}', href: '/analysis?sport=Dogs' },
    { label: 'Harness', icon: '\u{1F3CE}', href: '/analysis?sport=Racing' },
    { label: 'AI Picks', icon: '\u{1F916}', href: '/aipicks' },
    { label: 'Track Record', icon: '\u{1F4CA}', href: '/results' },
    { label: 'How It Works', icon: '\u{2699}', href: '/how-it-works' },
  ];

  return (
    <div className="bg-white border-b border-[#e5e5e5]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-0 overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <Link
              key={cat.label}
              href={cat.href}
              className="flex flex-col items-center gap-1 px-5 py-2.5 text-[12px] text-[#666] hover:text-[#333] border-b-2 border-transparent hover:border-[#f47920] transition-colors whitespace-nowrap shrink-0"
            >
              <span className="text-lg">{cat.icon}</span>
              <span>{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-3 gap-8 mb-8">
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Navigation</h4>
            <div className="space-y-2 text-[13px]">
              <Link href="/" className="block hover:text-white transition-colors">Home</Link>
              <Link href="/aipicks" className="block hover:text-white transition-colors">AI Picks</Link>
              <Link href="/results" className="block hover:text-white transition-colors">Track Record</Link>
              <Link href="/how-it-works" className="block hover:text-white transition-colors">How It Works</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Powered By</h4>
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#A855F7]"></span>
                Claude (Anthropic)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                GPT (OpenAI)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>
                Gemini (Google)
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Disclaimer</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              This is a content experiment. Gambling involves risk. Past results don&apos;t guarantee future performance. Never bet more than you can afford to lose. If you or someone you know has a gambling problem, call 1800 858 858.
            </p>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-4 flex items-center justify-between text-[12px]">
          <span>
            Built by{' '}
            <a
              href="https://x.com/milesdoesai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f47920] hover:text-[#e06810] transition-colors"
            >
              @milesdoesai
            </a>
          </span>
          <span className="text-gray-600">Powered by Claude, GPT &amp; Gemini</span>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <LiveTickerBar />
        <Header />
        <CategoryBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
