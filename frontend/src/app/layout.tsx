import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { AuthNav } from "@/components/AuthNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NBFC Loan Management",
  description: "AI-powered loan origination, risk assessment, and application management",
};

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
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-950">
        <div className="border-b border-zinc-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold tracking-tight text-zinc-900 hover:opacity-90 transition-opacity"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs text-white font-black">
                N
              </span>
              NBFC Loan Management
            </Link>
            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-5 text-sm font-medium text-zinc-500">
                <Link
                  className="hover:text-zinc-900 transition-colors"
                  href="/leads"
                >
                  Leads
                </Link>
                <Link
                  className="hover:text-zinc-900 transition-colors"
                  href="/applications"
                >
                  Applications
                </Link>
                <Link
                  className="hover:text-zinc-900 transition-colors"
                  href="/applications/new"
                >
                  New Application
                </Link>
                <Link
                  className="hover:text-zinc-900 transition-colors"
                  href="/leads/new"
                >
                  Create Lead
                </Link>
              </nav>
              <AuthNav />
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl flex-1 px-5 py-6">
          {children}
        </div>
      </body>
    </html>
  );
}
