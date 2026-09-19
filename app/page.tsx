import Link from 'next/link'
import { LineChart, GitCompareArrows, Building2, ArrowRight } from 'lucide-react'
import { HomeSearch } from '@/components/home-search'
import { MarketMovers } from '@/components/market-movers'

const MODULES = [
  {
    href: '/analysis',
    icon: LineChart,
    title: 'Analysis',
    desc: 'Deep-dive any stock — valuation, growth, analyst outlook, and AI-generated sentiment synthesized from Yahoo Finance and recent news.',
  },
  {
    href: '/compare',
    icon: GitCompareArrows,
    title: 'Compare',
    desc: 'Put two companies head-to-head. See how their valuation, margins, growth, and analyst targets stack up, metric by metric.',
  },
  {
    href: '/industry',
    icon: Building2,
    title: 'Industry',
    desc: 'Browse the top companies by screen — day gainers, most active, growth tech, undervalued large caps, and more.',
  },
]

export default function HomePage() {
  return (
    <div className="pb-24">
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Financial intelligence, all-seeing
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Every angle on the market, in one view
          </h1>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Argus aggregates and analyzes market data so you can compare companies, scan industries,
            and understand a stock&apos;s valuation, growth, and sentiment at a glance.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-xl">
          <HomeSearch />
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {MODULES.map((m) => {
            const Icon = m.icon
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
              >
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{m.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
                <span className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                  Open {m.title}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <MarketMovers />
    </div>
  )
}
