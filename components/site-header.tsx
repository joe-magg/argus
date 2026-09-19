"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArgusLogo } from "@/components/argus-logo"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/analysis", label: "Analysis" },
  { href: "/compare", label: "Compare" },
  { href: "/industry", label: "Industry" },
  { href: "/materials", label: "Raw Materials" },
  { href: "/news", label: "News" },
]

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2">
          <ArgusLogo />
          <span className="font-mono text-sm font-semibold tracking-[0.35em] text-foreground">
            ARGUS
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
