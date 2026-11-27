import { dateInIndia } from '@/lib/dates'
import { publishMockEvent } from '@/lib/realtime'
import { doctors, hospitals, restaurants } from '@/mocks/data'
import type { Call, CallEvent, Service, TranscriptLine } from '@/types'
import { mockData, saveMockCall } from './mock'

type ReplayEvent = CallEvent extends infer Event ? Event extends CallEvent ? Omit<Event, 'ts' | 'call_id'> : never : never
const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export async function replayCall(service: Service, signal: AbortSignal, index = 0) {
  const restaurant = restaurants[index]
  const hospital = hospitals[index]
  const doctor = doctors.find(item => item.hospital_id === hospital.hospital_id)!
  const business = service === 'restaurant' ? restaurant : hospital
  const id = service === 'restaurant' ? restaurant.restaurant_id : hospital.hospital_id
  const language = service === 'restaurant' ? 'hi' : 'te'
  const date = dateInIndia(1)
  const transcript: TranscriptLine[] = []
  const timeline: Call['tool_timeline'] = []
  const callId = 'c_' + crypto.randomUUID().replaceAll('-', '').slice(0, 12)
  const started = new Date().toISOString()

  function emit(event: ReplayEvent) {
    if (signal.aborted) return
    const ts = new Date().toISOString()
    if (event.type === 'transcript') {
      const { speaker, text, lang } = event.payload
      transcript.push({ speaker, text, lang, ts })
    }
    if (event.type === 'tool_called') timeline.push({ ...event.payload, ts })
    publishMockEvent({ type: 'call', event: { ...event, call_id: callId, ts } })
  }

  emit({ type: 'call_started', payload: { channel: 'web', from_number: '' } })
  emit({ type: 'agent_switched', payload: { agent: 'router' } })
  emit({ type: 'transcript', payload: { speaker: 'ai', text: 'Hi, I’m Vaani, an AI assistant. How can I help?', lang: 'en', final: true } })
  await pause(500)
  emit({ type: 'transcript', payload: { speaker: 'caller', text: service === 'restaurant' ? 'Kal dinner ke liye four people ka table chahiye.' : 'Repu doctor appointment kavali, please.', lang: language, final: true } })
  emit({ type: 'language_detected', payload: { language } })
  emit({ type: 'agent_switched', payload: { agent: service } })
  emit({ type: 'slot_filled', payload: { key: 'Date', value: date } })
  emit({ type: 'slot_filled', payload: { key: 'Business', value: business.name } })
  await pause(650)
  if (signal.aborted) return
  let outcome = 'no_availability'
  let bookingId: string | undefined
  try {
    const slot = service === 'restaurant'
      ? (await mockData.getRestaurantSlots(id, date)).find(row => row.time >= '18:30' && !row.blocked && restaurant.tables.some(table => table.capacity >= 4 && !row.booked_table_ids.includes(table.table_id)))
      : (await mockData.getDoctorSlots(doctor.doctor_id, date)).find(row => row.status === 'free')
    emit({ type: 'tool_called', payload: { tool: service === 'restaurant' ? 'get_restaurant_slots' : 'get_doctor_slots', summary: 'Checked availability at ' + business.name } })
    if (!slot) throw new Error('No suitable slot.')
    emit({ type: 'slot_filled', payload: { key: 'Time', value: slot.time } })
    emit({ type: 'transcript', payload: { speaker: 'ai', text: business.name + ' has availability at ' + slot.time + '. Shall I book it?', lang: 'en', final: true } })
    await pause(700)
    if (signal.aborted) return
    emit({ type: 'transcript', payload: { speaker: 'caller', text: service === 'restaurant' ? 'Haan, please confirm.' : 'Avunu, confirm cheyyandi.', lang: language, final: true } })
    const booking = await mockData.simulateBooking({
      service, business_id: id, doctor_id: service === 'hospital' ? doctor.doctor_id : undefined,
      date, time: slot.time, party_size: service === 'restaurant' ? 4 : undefined,
      name: service === 'restaurant' ? 'Sample guest' : 'Sample patient', phone: '',
      language, source: 'vaani_call', call_id: callId,
    })
    outcome = 'booked'
    bookingId = booking.booking_id
    emit({ type: 'booking_created', payload: { booking_id: bookingId, business_id: id } })
    emit({ type: 'tool_called', payload: { tool: service === 'restaurant' ? 'book_table' : 'book_appointment', summary: 'Created booking ' + bookingId } })
    emit({ type: 'transcript', payload: { speaker: 'ai', text: 'Your booking is confirmed. Your booking ID is ' + bookingId + '.', lang: 'en', final: true } })
  } catch {
    emit({ type: 'transcript', payload: { speaker: 'ai', text: 'That slot is unavailable. Shall I check another time?', lang: 'en', final: true } })
  }
  const summary = bookingId ? 'Booking ' + bookingId : 'No availability'
  await saveMockCall({
    call_id: callId, channel: 'web', direction: 'inbound', from_number: '', language,
    started_at: started, ended_at: new Date().toISOString(), services_used: [service],
    transcript, tool_timeline: timeline, latency_json: [], outcome_json: { outcome, booking_id: bookingId, date },
    summary,
  })
  emit({ type: 'call_ended', payload: { outcome } })
}
