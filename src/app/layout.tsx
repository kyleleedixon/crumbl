import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import "./globals.css";
import { FlavorSearch } from "@/components/FlavorSearch";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crumbl Tracker · Weekly Menu & Rarity",
  description:
    "Every Crumbl Cookies weekly menu, with rarity scores, debuts, and comebacks. Updated every Monday.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 text-stone-900">
        <header className="sticky top-0 z-20 border-b border-rose-100/80 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-6 sm:py-4">
            <Link
              href="/"
              className="order-1 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
            >
              <span className="text-2xl">🍪</span>
              <span>Crumbl Tracker</span>
            </Link>
            <nav className="order-2 ml-auto flex items-center gap-4 text-sm font-medium text-stone-700 sm:order-3 sm:ml-0 sm:gap-5">
              <Link href="/" className="hover:text-rose-700">
                Week
              </Link>
              <Link href="/rarity" className="hover:text-rose-700">
                Rarity
              </Link>
              <Link href="/weeks" className="hover:text-rose-700">
                Archive
              </Link>
              <a
                href="https://x.com/crumbltracker"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow @crumbltracker on X"
                title="Follow @crumbltracker on X"
                className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-stone-800"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Follow</span>
              </a>
            </nav>
            <div className="order-3 w-full sm:order-2 sm:ml-4 sm:mr-4 sm:w-auto sm:flex-1">
              <FlavorSearch />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
          {children}
        </main>
        <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-10">
          <span>Not affiliated with Crumbl®. Data aggregated from public menus.</span>
          <a
            href="https://x.com/crumbltracker"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-stone-300 bg-white/70 px-3 py-1.5 font-medium text-stone-700 hover:border-stone-500 hover:text-stone-900"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Follow @crumbltracker
          </a>
        </footer>
      </body>
    </html>
  );
}
