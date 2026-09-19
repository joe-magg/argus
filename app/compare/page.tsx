import { Suspense } from "react"
import { CompareClient } from "@/components/compare/compare-client"

export const metadata = {
  title: "Compare | Argus",
  description: "Compare two companies side by side across valuation, growth, and profitability.",
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareClient />
    </Suspense>
  )
}
