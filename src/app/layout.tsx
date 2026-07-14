import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { NavLink } from "@/components/nav-link";
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
  title: "Lehrgeld",
  description: "Abrechnung für freiberuflichen Sprachunterricht",
};

const NAV = [
  { href: "/buchungen", label: "Buchungen" },
  { href: "/rechnungen", label: "Rechnungen" },
  { href: "/kunden", label: "Kunden" },
  { href: "/leistungen", label: "Leistungen" },
  { href: "/einheiten", label: "Einheiten" },
  { href: "/einstellungen", label: "Einstellungen" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar px-4 py-6">
            <div className="mb-8 px-3">
              <span className="text-lg font-semibold tracking-tight">
                Lehrgeld
              </span>
              <p className="text-xs text-muted-foreground">
                Unterricht &amp; Abrechnung
              </p>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV.map((entry) => (
                <NavLink key={entry.href} href={entry.href}>
                  {entry.label}
                </NavLink>
              ))}
            </nav>
          </aside>
          <main className="flex-1 overflow-x-auto px-8 py-8">{children}</main>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
