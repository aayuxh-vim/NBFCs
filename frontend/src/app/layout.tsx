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
  title: "NBFC Lead Management",
  description: "Lead and application workflow UI",
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
        <div className="border-b bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight hover:opacity-90">
              NBFC Loan Management
            </Link>
            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-4 text-sm text-zinc-600">
                <Link className="hover:text-zinc-950" href="/leads">
                  Leads
                </Link>
                <Link className="hover:text-zinc-950" href="/applications">
                  Applications
                </Link>
                <Link className="hover:text-zinc-950" href="/leads/new">
                  Create Lead
                </Link>
              </nav>
              <AuthNav />
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
