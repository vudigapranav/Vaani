import { doctors, hospitals, restaurants, doctorTimes, restaurantTimes } from '@/mocks/data'
import { publishMockEvent } from '../realtime'
import { dateInIndia } from '../dates'
import type { Booking, Call, DoctorSlot, RestaurantSlot } from '@/types'
import type { BookingInput, DataSource } from './contracts'

interface DemoState {
  bookings: Booking[]
  blocks: string[]
  leave: string[]
  calls: Call[]
}

const stateKey = 'vaani-mock-state-v1'
let memoryState: DemoState = { bookings: [], blocks: [], leave: [], calls: [] }

function read(): DemoState {
  if (typeof window === 'undefined') return memoryState
  try {
    const value = localStorage.getItem(stateKey)
    return value ? JSON.parse(value) as DemoState : memoryState
  } catch {
    return memoryState
  }
}

function mutate<T>(update: (state: DemoState) => T): Promise<T> {
  function write() {
    const state = structuredClone(read())
    const result = update(state)
    memoryState = state
    if (typeof window !== 'undefined') localStorage.setItem(stateKey, JSON.stringify(state))
    return result
  }
  if (typeof window !== 'undefined' && navigator.locks) {
    return navigator.locks.request(stateKey, write)
  }
  return Promise.resolve().then(write)
}

function visibleTimes(date: string, times: string[]) {
  return date >= dateInIndia() && date <= dateInIndia(6) ? times : []
}

function activeBookings(state: DemoState, date: string) {
  return state.bookings.filter(booking => booking.date === date && booking.status !== 'cancelled')
}

function restaurantSlots(state: DemoState, id: string, date: string): RestaurantSlot[] {
  const bookings = activeBookings(state, date).filter(booking => booking.business_id === id)
  return visibleTimes(date, restaurantTimes).map(time => ({
    restaurant_id: id,
    date,
    time,
    blocked: state.blocks.includes([id, date, time].join('/')),
    booked_table_ids: bookings.flatMap(booking => booking.time === time && booking.table_id ? [booking.table_id] : []),
  }))
}

function doctorSlots(state: DemoState, id: string, date: string): DoctorSlot[] {
  const bookings = activeBookings(state, date).filter(booking => booking.doctor_id === id)
  return visibleTimes(date, doctorTimes).map(time => {
    const on_leave = state.leave.includes([id, date].join('/'))
    const blocked = on_leave || state.blocks.includes([id, date, time].join('/'))
    const booked = bookings.some(booking => booking.time === time)
    return { doctor_id: id, date, time, on_leave, status: booked ? 'booked' : blocked ? 'blocked' : 'free' }
  })
}

function chooseTable(state: DemoState, input: BookingInput) {
  const restaurant = restaurants.find(item => item.restaurant_id === input.business_id)
  const party = input.party_size ?? 0
  if (!restaurant || !Number.isInteger(party) || party < 1 || party > restaurant.booking_rules.max_party_size) {
    throw new Error('Choose a valid restaurant and party size.')
  }
  const slot = restaurantSlots(state, input.business_id, input.date).find(item => item.time === input.time)
  const table = slot && !slot.blocked && restaurant.tables.find(item =>
    item.capacity >= party && !slot.booked_table_ids.includes(item.table_id) &&
    (!input.table_id || item.table_id === input.table_id),
  )
  if (!table) throw new Error('No table is available at that time.')
  const amount = party >= restaurant.booking_rules.deposit_required_for_party_size_at_least ? restaurant.booking_rules.deposit_inr : 0
  return { table_id: table.table_id, amount }
}

function validateDoctor(state: DemoState, input: BookingInput) {
  const doctor = doctors.find(item => item.doctor_id === input.doctor_id && item.hospital_id === input.business_id)
  if (!doctor || !doctorSlots(state, doctor.doctor_id, input.date).some(slot => slot.time === input.time && slot.status === 'free')) {
    throw new Error('No doctor appointment is available at that time.')
  }
  return { amount: doctor.consultation_fee_inr }
}

function notifyBooking(booking: Booking) {
  publishMockEvent({ type: 'booking', booking })
  publishMockEvent({ type: 'slots', resourceId: booking.doctor_id ?? booking.business_id, date: booking.date })
}

export const mockData: DataSource = {
  async getBusinesses({ area, type } = {}) {
    const businesses = [
      ...(type !== 'hospital' ? restaurants : []),
      ...(type !== 'restaurant' ? hospitals : []),
    ]
    return businesses.filter(business => !area || business.area_id === area)
  },
  async getRestaurant(key) { return restaurants.find(item => item.restaurant_id === key || item.slug === key) },
  async getRestaurantSlots(id, date) {
    return restaurants.some(item => item.restaurant_id === id) ? restaurantSlots(read(), id, date) : []
  },
  async getHospital(key) {
    const hospital = hospitals.find(item => item.hospital_id === key || item.slug === key)
    if (!hospital) return undefined
    const { leave } = read()
    return {
      ...hospital,
      doctors: doctors.filter(item => item.hospital_id === hospital.hospital_id).map(doctor => ({
        ...doctor,
        on_leave_dates: leave.filter(key => key.startsWith(doctor.doctor_id + '/')).map(key => key.split('/')[1]),
      })),
    }
  },
  async getDoctorSlots(id, date) { return doctors.some(item => item.doctor_id === id) ? doctorSlots(read(), id, date) : [] },
  async getBooking(id) { return read().bookings.find(booking => booking.booking_id === id) },
  async getPartnerBookings(id, date) { return read().bookings.filter(booking => booking.business_id === id && booking.date === date) },
  async patchBooking(id, { status }) {
    const booking = await mutate(state => {
      const booking = state.bookings.find(item => item.booking_id === id)
      if (!booking) throw new Error('Booking not found.')
      if (booking.status === 'cancelled' && status !== 'cancelled') throw new Error('Booking has been cancelled.')
      booking.status = status
      return booking
    })
    notifyBooking(booking)
    return booking
  },
  async payBooking(id) {
    const booking = await mutate(state => {
      const item = state.bookings.find(row => row.booking_id === id)
      if (!item) throw new Error('Booking not found.')
      if (item.status !== 'pending_payment' && item.status !== 'paid') throw new Error('This booking has no payment due.')
      item.status = 'paid'
      return item
    })
    notifyBooking(booking)
    return booking
  },
  async blockSlot({ resourceId, date, time, blocked }) {
    const times = time ? [time] : restaurantTimes
    const keys = times.map(value => [resourceId, date, value].join('/'))
    await mutate(state => {
      state.blocks = state.blocks.filter(item => !keys.includes(item))
      if (blocked) state.blocks.push(...keys)
    })
    publishMockEvent({ type: 'slots', resourceId, date })
  },
  async setDoctorLeave(id, date, onLeave) {
    const key = [id, date].join('/')
    await mutate(state => {
      state.leave = state.leave.filter(item => item !== key)
      if (onLeave) state.leave.push(key)
    })
    publishMockEvent({ type: 'slots', resourceId: id, date })
  },
  async simulateBooking(input) {
    const booking = await mutate(state => {
      const { amount, ...assignment } = input.service === 'restaurant' ? chooseTable(state, input) : validateDoctor(state, input)
      const booking: Booking = {
        ...input, ...assignment,
        booking_id: 'VN-' + String(state.bookings.length + 1).padStart(4, '0'),
        status: amount > 0 ? 'pending_payment' : 'confirmed',
        amount_due_inr: amount,
        created_at: new Date().toISOString(),
      }
      state.bookings.push(booking)
      return booking
    })
    notifyBooking(booking)
    return booking
  },
  async getCalls() { return read().calls },
  async getCall(id) { return read().calls.find(call => call.call_id === id) },
  async getEval() { return { placeholder: true, tests: [] } },
}

export async function saveMockCall(call: Call) {
  await mutate(state => {
    state.calls = [call, ...state.calls.filter(item => item.call_id !== call.call_id)]
  })
}
