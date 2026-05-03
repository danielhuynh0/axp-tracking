import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AXP Tracker",
  description: "Track your Architectural Experience Program hours",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 min-h-screen`}>
        <nav className="bg-slate-900 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center">
            <a
              href="/projects"
              className="font-semibold text-lg tracking-tight hover:text-blue-300 transition-colors"
            >
              AXP Tracker
            </a>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
