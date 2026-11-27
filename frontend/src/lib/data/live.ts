import type { Booking, Call, Doctor, DoctorSlot, Hospital, Payment, Restaurant } from '@/types'
import { dateInIndia } from '@/lib/dates'
import { partnerCode } from './session'
import type { DataSource } from './contracts'

const base = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? ''
type LiveHospital = Hospital & { doctors: Doctor[] }
type Schedule = Record<string, string | string[]>
type LiveRestaurantRow = Omit<Restaurant, 'opening_hours'> & { opening_hours: Schedule }
type LiveDoctorRow = Omit<Doctor, 'schedule' | 'on_leave_dates'> & { schedule: Schedule; on_leave_day_offsets?: number[] }
type LiveHospitalRow = Omit<Hospital, 'opd_hours'> & { opd_hours: Schedule; doctors: LiveDoctorRow[] }
type BusinessRow = LiveRestaurantRow | LiveHospitalRow
type LiveBooking = Omit<Booking, 'phone'> & { phone_masked?: string; payments?: Payment[] }
type LiveCall = Omit<Call, 'from_number' | 'transcript' | 'latency_json'> & {
  transcript: (Omit<Call['transcript'][number], 'speaker'> & { speaker: 'caller' | 'vaani' })[]
  latency_json: { voice_turns?: Call['latency_json'] }
}
const callFields = 'call_id,channel,direction,started_at,ended_at,language,services_used,transcript,outcome_json,tool_timeline,latency_json,recording_url,summary'
type RestaurantAvailability = {
  time: string; free_tables: number; total_tables: number; blocked: boolean; past: boolean
}

async function api<T>(path: string, method = 'GET', body?: unknown, businessId?: string): Promise<T> {
  if (!base) throw new Error('Configure the Vaani backend URL first.')
  const code = businessId ? partnerCode(businessId) : null
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (code) headers['X-Partner-Passcode'] = code
  const response = await fetch(base + '/api' + path, {
    method, headers, cache: 'no-store',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw Object.assign(new Error(error?.detail?.message ?? 'The booking service could not complete the request.'), {
      status: response.status,
    })
  }
  return response.json() as Promise<T>
}

const booking = ({ phone_masked, ...row }: LiveBooking): Booking => ({ ...row, phone: phone_masked ?? '' })
const dated = (path: string, date: string) => path + '?date=' + encodeURIComponent(date)

function scheduleLabel(schedule: Schedule) {
  return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].flatMap(day => {
    const value = schedule[day]
    const hours = Array.isArray(value) ? value.join(', ') : value
    return hours ? [day[0].toUpperCase() + day.slice(1) + ' ' + hours] : []
  }).join(' · ')
}

function business(row: BusinessRow): Restaurant | LiveHospital {
  if ('restaurant_id' in row) return { ...row, opening_hours: scheduleLabel(row.opening_hours) }
  return {
    ...row, opd_hours: scheduleLabel(row.opd_hours),
    doctors: row.doctors.map(doctor => ({
      ...doctor, schedule: scheduleLabel(doctor.schedule),
      on_leave_dates: (doctor.on_leave_day_offsets ?? []).map(day => dateInIndia(day)),
    })),
  }
}

async function calls(filters: Record<string, string>): Promise<Call[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Configure the Supabase URL and public key to load call logs.')
  const response = await fetch(url + '/rest/v1/calls?' + new URLSearchParams({ select: callFields, ...filters }), {
    headers: { apikey: key }, cache: 'no-store',
  })
  if (!response.ok) throw new Error('Could not load call logs from Supabase.')
  const rows: LiveCall[] = await response.json()
  return rows.map(row => ({
    ...row, from_number: '',
    transcript: row.transcript.map(line => ({ ...line, speaker: line.speaker === 'vaani' ? 'ai' : 'caller' })),
    latency_json: row.latency_json.voice_turns ?? [],
  }))
}

export const liveData: DataSource = {
  async getBusinesses(filters = {}) {
    const rows = await api<BusinessRow[]>('/businesses?' + new URLSearchParams(filters))
    return rows.map(business)
  },
  async getRestaurant(key) {
    const rows = await this.getBusinesses({ type: 'restaurant' })
    return rows.find((row): row is Restaurant => 'restaurant_id' in row && (row.restaurant_id === key || row.slug === key))
  },
  async getHospital(key) {
    const rows = await this.getBusinesses({ type: 'hospital' })
    return rows.find((row): row is LiveHospital => 'doctors' in row && 'hospital_id' in row && (row.hospital_id === key || row.slug === key))
  },
  async getRestaurantSlots(id, date) {
    const { slots } = await api<{ slots: RestaurantAvailability[] }>(dated('/restaurants/' + encodeURIComponent(id) + '/slots', date))
    return slots.map(slot => ({ ...slot, restaurant_id: id, date, booked_table_ids: [] }))
  },
  async getDoctorSlots(id, date) {
    const { slots, on_leave } = await api<{ slots: DoctorSlot[]; on_leave: boolean }>(dated('/doctors/' + encodeURIComponent(id) + '/slots', date))
    return slots.map(slot => ({ ...slot, doctor_id: id, date, on_leave }))
  },
  async getBooking(id) {
    try {
      return booking(await api<LiveBooking>('/bookings/' + encodeURIComponent(id)))
    } catch (error) {
      if ((error as { status?: number }).status === 404) return undefined
      throw error
    }
  },
  async getPartnerBookings(id, date) {
    return (await api<LiveBooking[]>(dated('/partners/' + encodeURIComponent(id) + '/bookings', date), 'GET', undefined, id)).map(booking)
  },
  async patchBooking(id, { status }) {
    const current = status === 'cancelled' ? undefined : await this.getBooking(id)
    return booking(await api<LiveBooking>('/bookings/' + encodeURIComponent(id), 'PATCH', { status }, current?.business_id))
  },
  async payBooking(id) {
    await api('/payments/' + encodeURIComponent(id) + '/mock-pay', 'POST')
    const result = await this.getBooking(id)
    if (!result) throw new Error('Booking not found.')
    return result
  },
  async blockSlot({ resourceId, businessId, date, time, blocked }) {
    const id = businessId ?? resourceId
    await api('/slots/block', 'POST', { business_id: id, doctor_id: id === resourceId ? undefined : resourceId, date, time, all_day: !time, blocked }, id)
  },
  async setDoctorLeave(id, date, onLeave, businessId) {
    await api('/doctors/' + encodeURIComponent(id) + '/leave', 'POST', { date, on_leave: onLeave }, businessId)
  },
  async simulateBooking(input) {
    const { business_id, doctor_id, date, time, party_size, name, language } = input
    const result = await api<{ booking: { booking_id: string } }>('/dev/simulate-booking', 'POST', { business_id, doctor_id, date, time, party_size, name, language })
    const created = await this.getBooking(result.booking.booking_id)
    if (!created) throw new Error('The booking was created but its status could not be loaded.')
    return created
  },
  async getCalls() { return calls({ order: 'started_at.desc', limit: '50' }) },
  async getCall(id) { return (await calls({ call_id: 'eq.' + id, limit: '1' }))[0] },
  async getEval() { return { placeholder: true, tests: [] } },
}
