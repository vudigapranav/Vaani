'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getDataSource } from '@/lib/data'
import { replayCall } from '@/lib/data/replay'
import { isLive } from '@/lib/data/session'
import { useResource } from '@/lib/data/use-resource'
import { getRealtimeSource } from '@/lib/realtime'
import { subscribeDatabase } from '@/lib/realtime/database'
import type { CallEvent, Service } from '@/types'
import { action, BookingLayout, CallLinks, Message, panel, secondary, title } from './common'

const data = getDataSource()
const backend = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '')
type CallGroups = Record<string, CallEvent[]>

export function Studio() {
  const [calls, setCalls] = useState<CallGroups>({})
  const [selected, setSelected] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const replay = useRef<AbortController>(null)

  useEffect(() => {
    if (isLive) return
    const unsubscribe = getRealtimeSource().subscribeCallEvents(undefined, event => {
      setCalls(current => ({ ...current, [event.call_id]: [...(current[event.call_id] ?? []), event] }))
    })
    return () => { unsubscribe(); replay.current?.abort() }
  }, [])

  async function run(services: Service[]) {
    const controller = new AbortController()
    replay.current = controller
    setSelected('')
    setCalls({})
    setRunning(true)
    setError('')
    try {
      await Promise.all(services.map((service, index) => replayCall(service, controller.signal, index)))
    } catch {
      setError('The demo could not finish. Reload the page to retry.')
    } finally {
      if (!controller.signal.aborted) setRunning(false)
    }
  }

  const id = selected || Object.keys(calls)[0]
  const events = calls[id] ?? []
  const lines = events.filter(event => event.type === 'transcript')
  const tools = events.filter(event => event.type === 'tool_called')
  const slots = Object.fromEntries(events.filter(event => event.type === 'slot_filled').map(event => [event.payload.key, event.payload.value]))
  const currentAgent = events.filter(event => event.type === 'agent_switched').at(-1)?.payload.agent
  const bookingId = events.find(event => event.type === 'booking_created')?.payload.booking_id

  return <BookingLayout>
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className={title}>Live Call Studio</h1><Link className={secondary} href="/calls">Call logs</Link></div>
    {isLive ? <section className={panel + ' space-y-3'}><p>Open the browser call console for audio, transcripts and tool events.</p><CallLinks />{!backend && <p>Configure the backend URL to connect.</p>}</section> : <>
      <p className="text-muted-foreground">Scripted demo · Replays use the same mock bookings and slots as the partner portals.</p>
      <div className="flex flex-wrap gap-2"><button className={action} disabled={running} onClick={() => void run(['restaurant'])}>Replay restaurant call</button><button className={action} disabled={running} onClick={() => void run(['hospital'])}>Replay hospital call</button><button className={secondary} disabled={running} onClick={() => void run(['restaurant', 'hospital', 'restaurant', 'hospital'])}>Rush hour replay</button></div>
      {error && <p role="alert">{error}</p>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(calls).map(([key, events], index) => <button key={key} aria-pressed={key === id} className={secondary} onClick={() => setSelected(key)}>Call {index + 1} · {events.some(event => event.type === 'call_ended') ? 'Ended' : 'In progress'}</button>)}</div>
      {id && <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className={panel + ' space-y-3'}><h2 className="font-display text-2xl">Transcript</h2><ol className="space-y-3" aria-live="polite">{lines.map((event, index) => <li key={index}><strong>{event.payload.speaker === 'ai' ? 'Vaani' : 'Caller'}</strong> <span className="text-sm text-live">{event.payload.lang.toUpperCase()}</span><p>{event.payload.text}</p></li>)}</ol></section>
        <aside className={panel + ' space-y-3'}><h2 className="font-display text-2xl">Call activity</h2><p>Active agent · {currentAgent ?? 'Router'}</p><dl>{Object.entries(slots).map(([name, value]) => <div key={name}><dt className="font-semibold">{name}</dt><dd>{value}</dd></div>)}</dl><ul>{tools.map((event, index) => <li key={index}>{event.payload.summary}</li>)}</ul>{bookingId && <Link className={action} href={'/b/' + bookingId}>{bookingId}</Link>}</aside>
      </div>}
    </>}
  </BookingLayout>
}

export function Calls() {
  const { value, error, refresh } = useResource(data.getCalls, isLive ? 5000 : 0)
  useEffect(() => isLive
    ? subscribeDatabase('calls', undefined, refresh)
    : getRealtimeSource().subscribeCallEvents(undefined, event => { if (event.type === 'call_ended') refresh() }), [refresh])
  return <BookingLayout><h1 className={title}>Call logs</h1><Message error={error}>
    <ul className="space-y-3">
      {value?.map(call => <li className={panel} key={call.call_id}><Link href={'/calls/' + call.call_id} className="font-semibold underline">{call.summary}</Link><p>{call.language.toUpperCase()} · {call.services_used.join(', ')} · {new Date(call.started_at).toLocaleString('en-IN')}</p></li>)}
      {value?.length === 0 && <li>No calls recorded yet.</li>}
    </ul>
  </Message><Link href="/studio" className={action}>Open Studio</Link></BookingLayout>
}

export function CallDetail({ id }: { id: string }) {
  const load = useCallback(() => data.getCall(id), [id])
  const { value: call, error, loading } = useResource(load)
  return <BookingLayout><Link href="/calls">All calls</Link><h1 className={title}>{call?.summary ?? 'Call detail'}</h1>
    <Message error={error}>{call ? <>
      <section className={panel}><h2 className="font-display text-2xl">Transcript</h2><ol className="space-y-2">{call.transcript.map((line, index) => <li key={index}><strong>{line.speaker === 'ai' ? 'Vaani' : 'Caller'}</strong> · {line.lang.toUpperCase()}<p>{line.text}</p></li>)}</ol></section>
      <section className={panel}><h2 className="font-display text-2xl">Tools</h2><ul>{call.tool_timeline.map((item, index) => <li key={index}>{item.tool} · {item.summary}</li>)}</ul></section>
      {call.latency_json.length > 0 && <section className={panel}><h2 className="font-display text-2xl">Turn latency</h2><ol>{call.latency_json.map((turn, index) => <li key={index}>{Math.round(turn.turn_total)} ms total</li>)}</ol></section>}
      <section className={panel}><h2 className="font-display text-2xl">Outcome</h2><pre className="overflow-auto">{JSON.stringify(call.outcome_json, null, 2)}</pre>{call.recording_url && <a className={secondary} href={call.recording_url}>Recording</a>}</section>
    </> : <p>{loading ? 'Loading call…' : 'Call unavailable.'}</p>}</Message>
  </BookingLayout>
}

export function Evaluation() {
  const { value, error } = useResource(data.getEval)
  return <BookingLayout><h1 className={title}>Evaluation</h1><Message error={error}>
    <section className={panel + ' space-y-3'}>
      <h2 className="font-display text-2xl">Measured results</h2>
      <p>Upstream evaluation · 23 November 2026</p>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div><dt>Text outcomes</dt><dd className="text-3xl">40/40</dd><p>After tuning on the scripted calls</p></div>
        <div><dt>Voice bookings</dt><dd className="text-3xl">9/10</dd><p>Synthetic WebRTC callers</p></div>
        <div><dt>Median first audio</dt><dd className="text-3xl">1.51 s</dd><p>Measured at the caller</p></div>
      </dl>
      {value?.placeholder && <p>This environment has no per-call evaluation results.</p>}
      {value?.tests.length ? <table className="w-full text-left"><thead><tr><th>Call</th><th>Language</th><th>Result</th></tr></thead><tbody>{value.tests.map(test => <tr key={test.call_id}><td>{test.call_id}</td><td>{test.language.toUpperCase()}</td><td>{test.passed ? 'Pass' : 'Fail'} · {test.reason}</td></tr>)}</tbody></table> : null}
      <a className={secondary} href="https://github.com/vudigapranav/Vaani/blob/main/EVAL.md">Evaluation report</a>
    </section>
  </Message></BookingLayout>
}
