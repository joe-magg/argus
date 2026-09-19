import { Suspense } from 'react'
import { AnalysisClient } from '@/components/analysis/analysis-client'

export default function AnalysisPage() {
  return (
    <Suspense fallback={null}>
      <AnalysisClient />
    </Suspense>
  )
}
