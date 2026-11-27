'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { dateInIndia } from '@/lib/dates'

export const panel = 'rounded-2xl border border-border bg-muted p-5'
export const field = 'min-h-11 rounded-lg border border-border bg-background px-3 text-foreground'
export const action = 'inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50'
export const secondary = 'inline-flex min-h-11 items-center rounded-lg border border-border px-3 py-2 hover:bg-muted'
export const title = 'font-display text-4xl font-semibold md:text-6xl'

export function BookingLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl space-y-6 px-5 py-10">{children}</div>
}

export function DateField({ date, change }: { date: string; change: (date: string) => void }) {
  return <label className="flex flex-wrap items-center gap-2">Date <input className={field} type="date" min={dateInIndia()} max={dateInIndia(6)} value={date} onChange={event => { if (event.target.value) change(event.target.value) }} /></label>
}

export function Message({ error, children }: { error?: string; children?: ReactNode }) {
  return error ? <p className={panel} role="alert">{error}</p> : <>{children}</>
}

export function CallLinks() {
  const number = process.env.NEXT_PUBLIC_VAANI_PHONE
  const voiceTest = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') + '/voice-test'
  return <div className="flex flex-wrap gap-2">
    {number && /^\+[1-9]\d{7,14}$/.test(number) && <a href={'tel:' + number} className={action}>Call Vaani</a>}
    {process.env.NEXT_PUBLIC_DATA_MODE === 'live' && process.env.NEXT_PUBLIC_BACKEND_URL
      ? <a className={action} href={voiceTest}>Talk to Vaani</a>
      : <Link className={action} href="/studio">Try a demo call</Link>}
  </div>
}
