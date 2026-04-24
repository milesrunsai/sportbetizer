import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MilesRunsAI Sportsbetalizer",
  description: "3 AI Models. 1 Daily Multi. Real Money.",
};

function Header() {
  return (
    <header className="border-b border-[#2d2d50] bg-[#0f0f23]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="MilesRunsAI" width={160} height={32} className="h-8 w-auto" priority />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1a2e] transition-colors"
          >
            Today&apos;s Multi
          </Link>
          <Link
            href="/analysis"
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1a2e] transition-colors"
          >
            Analysis
          </Link>
          <Link
            href="/results"
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1a2e] transition-colors"
          >
            Track Record
          </Link>
          <Link
            href="/how-it-works"
            className="hidden sm:block px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1a2e] transition-colors"
          >
            How It Works
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#2d2d50] mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-slate-600">
        Built by{' '}
        <a
          href="https://x.com/milesdoesai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#4A9EE8] hover:text-[#4A9EE8]/80 transition-colors"
        >
          @milesdoesai
        </a>
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
