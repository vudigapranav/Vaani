type Table = 'bookings' | 'restaurant_slots' | 'doctor_slots' | 'calls'
type Subscription = { table: Table; filter?: string; listeners: Set<() => void>; ref?: string }
type Frame = { event?: string; topic?: string }

const channels = new Map<string, Subscription>()
let socket: WebSocket | undefined
let heartbeat: number | undefined
let retry: number | undefined
let nextRef = 0

function send(topic: string, event: string, payload: unknown, joinRef?: string) {
  const ref = String(++nextRef)
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ topic, event, payload, ref, join_ref: event === 'phx_join' ? ref : joinRef }))
  }
  return ref
}

function join(topic: string, sub: Subscription) {
  sub.ref = send(topic, 'phx_join', {
    config: {
      broadcast: { ack: false, self: false },
      presence: { enabled: false },
      private: false,
      postgres_changes: [{ event: '*', schema: 'public', table: sub.table, filter: sub.filter }],
    },
  })
}

function connect(url: URL) {
  if (socket || retry !== undefined) return
  const connection = new WebSocket(url)
  socket = connection
  connection.onopen = () => {
    if (socket !== connection) return
    for (const [topic, sub] of channels) join(topic, sub)
    heartbeat = window.setInterval(() => send('phoenix', 'heartbeat', {}), 20_000)
  }
  connection.onmessage = ({ data }) => {
    if (typeof data !== 'string') return
    let frame: Frame | null
    try { frame = JSON.parse(data) } catch { return }
    if (frame?.event === 'postgres_changes' && frame.topic) {
      for (const listener of channels.get(frame.topic)?.listeners ?? []) listener()
    }
  }
  connection.onclose = () => {
    if (socket !== connection) return
    socket = undefined
    window.clearInterval(heartbeat)
    if (!channels.size) return
    retry = window.setTimeout(() => {
      retry = undefined
      if (channels.size) connect(url)
    }, 5000)
  }
}

export function subscribeDatabase(table: Table, filter: string | undefined, listener: () => void) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!base || !key || typeof WebSocket === 'undefined') return
  let url: URL
  try {
    url = new URL('/realtime/v1/websocket', base)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.searchParams.set('apikey', key)
    url.searchParams.set('vsn', '1.0.0')
  } catch { return }

  const topic = 'realtime:vaani:' + table + (filter ? ':' + filter : '')
  let sub = channels.get(topic)
  if (!sub) {
    sub = { table, filter, listeners: new Set() }
    channels.set(topic, sub)
    if (socket?.readyState === WebSocket.OPEN) join(topic, sub)
  }
  sub.listeners.add(listener)
  connect(url)

  return () => {
    sub.listeners.delete(listener)
    if (sub.listeners.size) return
    if (sub.ref) send(topic, 'phx_leave', {}, sub.ref)
    channels.delete(topic)
    if (channels.size) return
    window.clearTimeout(retry)
    retry = undefined
    window.clearInterval(heartbeat)
    socket?.close()
    socket = undefined
  }
}
