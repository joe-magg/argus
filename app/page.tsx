import Link from "next/link"
import { LineChart, GitCompareArrows, Building2, Gem, Newspaper, ArrowRight } from "lucide-react"
import { ArgusLogo } from "@/components/argus-logo"

const SECTIONS = [
  {
    href: "/analysis",
    icon: LineChart,
    title: "Analysis",
    desc: "Search any listed company and get a Nemotron-driven read on its stock — direction, valuation, risk, and a modeled projection for any amount and horizon.",
  },
  {
    href: "/compare",
    icon: GitCompareArrows,
    title: "Compare",
    desc: "Put two companies head to head. Argus weighs momentum, history, and risk-adjusted returns to judge which is more likely to rise.",
  },
  {
    href: "/industry",
    icon: Building2,
    title: "Industry",
    desc: "A briefing on the whole market over the past week — major indices, breadth, rotation, and volatility, with live charts.",
  },
  {
    href: "/materials",
    icon: Gem,
    title: "Raw Materials",
    desc: "Track gold, silver, platinum, oil, and diamonds. In-depth commodity situations with statistics and charts.",
  },
  {
    href: "/news",
    icon: Newspaper,
    title: "News",
    desc: "World events — politics, wars, disasters, executive decisions — and exactly which markets each one moves.",
  },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="flex flex-col items-center gap-6 pt-20 pb-16 text-center">
        <ArgusLogo className="h-16" />
        <div className="flex flex-col gap-4">
          <h1 className="font-mono text-5xl font-bold tracking-[0.3em] text-foreground sm:text-6xl">ARGUS</h1>
          <p className="mx-auto max-w-2xl text-lg text-pretty text-muted-foreground">
            The all-seeing eye on the markets. Stock analysis, comparisons, industry briefings, commodities,
            and news impact — powered by{" "}
            <span className="text-primary">NVIDIA Nemotron 3.5 Lightning</span> and live Yahoo Finance data.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/analysis"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start analyzing
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/industry"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            See the market
          </Link>
        </div>
      </section>

      <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  {s.title}
                  <ArrowRight className="size-4 -translate-x-1 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
