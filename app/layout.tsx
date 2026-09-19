import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { SiteHeader } from "@/components/site-header"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "Argus — Finance Intelligence",
  description:
    "Argus watches the markets. Stock analysis, company comparison, industry briefings, commodities, and news impact — powered by NVIDIA Nemotron 3.5 Lightning and live Yahoo Finance data.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#0a0f0c",
  colorScheme: "dark",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark bg-background ${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <SiteHeader />
        <main className="min-h-[calc(100dvh-3.5rem)]">{children}</main>
      </body>
    </html>
  )
}
