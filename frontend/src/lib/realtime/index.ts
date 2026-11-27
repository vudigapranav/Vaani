import type { Booking, CallEvent, Payment } from '@/types'

export type MockEvent =
  | { type: 'booking'; booking: Booking }
  | { type: 'slots'; resourceId: string; date: string }
  | { type: 'payment'; payment: Payment }
  | { type: 'call'; event: CallEvent }

type Listener = (event: MockEvent) => void
const listeners = new Set<Listener>()
let channel: BroadcastChannel | undefined

function getChannel() {
  if (!channel && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('vaani-demo-v1')
    channel.onmessage = (message: MessageEvent<MockEvent>) => notify(message.data)
  }
  return channel
}

function notify(event: MockEvent) {
  for (const listener of listeners) listener(event)
}

export function publishMockEvent(event: MockEvent) {
  getChannel()?.postMessage(event)
  notify(event)
}

function subscribe(listener: Listener) {
  getChannel()
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export interface RealtimeSource {
  subscribeBookings(businessId: string, date: string | undefined, listener: (booking: Booking) => void): () => void
  subscribeSlots(resourceId: string, date: string, listener: () => void): () => void
  subscribePayments(bookingId: string, listener: (payment: Payment) => void): () => void
  subscribeCallEvents(callId: string | undefined, listener: (event: CallEvent) => void): () => void
}

const mockRealtime: RealtimeSource = {
  subscribeBookings: (businessId, date, listener) => subscribe(event => {
    if (event.type === 'booking' && event.booking.business_id === businessId && (!date || event.booking.date === date)) {
      listener(event.booking)
    }
  }),
  subscribeSlots: (resourceId, date, listener) => subscribe(event => {
    if (event.type === 'slots' && event.resourceId === resourceId && event.date === date) listener()
  }),
  subscribePayments: (bookingId, listener) => subscribe(event => {
    if (event.type === 'payment' && event.payment.booking_id === bookingId) listener(event.payment)
  }),
  subscribeCallEvents: (callId, listener) => subscribe(event => {
    if (event.type === 'call' && (!callId || event.event.call_id === callId)) listener(event.event)
  }),
}

export function getRealtimeSource(): RealtimeSource {
  if (process.env.NEXT_PUBLIC_DATA_MODE === 'live') throw new Error('Live realtime is scheduled for Phase 6.')
  return mockRealtime
}
