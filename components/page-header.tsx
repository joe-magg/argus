import type { LucideIcon } from "lucide-react"

export function PageHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border pb-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
      </div>
      <p className="max-w-2xl text-pretty text-muted-foreground">{description}</p>
    </header>
  )
}
