import { Shell } from '@/components/layout/shell'
import type { ReactNode } from 'react'

export default function OperationsLayout({ children }: { children: ReactNode }) {
  return <Shell mode="demo">{children}</Shell>
}
