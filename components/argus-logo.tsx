import { cn } from "@/lib/utils"

/**
 * The Argus mark: an all-seeing eye. Outline inherits currentColor;
 * the iris carries the brand green.
 */
export function ArgusLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 30"
      fill="none"
      className={cn("h-6 w-auto text-foreground", className)}
      aria-hidden="true"
    >
      <path
        d="M2 15C9 4 39 4 46 15C39 26 9 26 2 15Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="15" r="8.5" className="fill-primary" />
      <circle cx="24" cy="15" r="3.6" className="fill-background" />
      <circle cx="21" cy="12" r="1.4" className="fill-foreground" />
    </svg>
  )
}
