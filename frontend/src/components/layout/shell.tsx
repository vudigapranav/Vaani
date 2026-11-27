import Link from 'next/link'
import type { ReactNode } from 'react'

export function Shell({ children, mode = 'public' }: { children: ReactNode; mode?: 'public' | 'partner' | 'demo' }) {
  return (
    <div data-theme={mode === 'public' ? 'light' : 'dark'} className="min-h-dvh bg-background text-foreground">
      <header className="vaani-shell-header border-b border-border">
        <div className="mx-auto flex min-h-18 max-w-6xl items-center gap-4 px-6">
          <Link href="/" className="inline-flex min-h-11 items-center gap-3 font-display text-3xl font-semibold">
            <span aria-hidden className="grid size-8 place-items-center rounded-full bg-primary text-sm text-primary-foreground">V</span>
            Vaani
          </Link>
          {mode !== 'public' && <span className="text-sm text-muted-foreground">{mode === 'partner' ? 'Partner portal' : 'Demo'}</span>}
          <nav className="ml-auto flex flex-wrap gap-3 text-sm" aria-label="Vaani">
            <Link href="/explore">Explore</Link>
            <Link href="/partner/login">Partner access</Link>
            <Link href="/studio">Studio</Link>
            <Link href="/eval">Evaluation</Link>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
    </div>
  )
}
