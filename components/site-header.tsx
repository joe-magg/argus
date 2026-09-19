'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Eye, GitCompareArrows, LineChart, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/analysis', label: 'Analysis', icon: LineChart },
  { href: '/compare', label: 'Compare', icon: GitCompareArrows },
  { href: '/industry', label: 'Industry', icon: Building2 },
]

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Eye className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Argus</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <span className="size-1.5 rounded-full bg-gain" />
          Live market data
        </div>
      </div>
    </header>
  )
}
