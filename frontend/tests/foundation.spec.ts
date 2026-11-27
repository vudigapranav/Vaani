import { expect, test } from '@playwright/test'
import { mockData } from '../src/lib/data/mock'
import { dateInIndia } from '../src/lib/dates'
import { getRealtimeSource } from '../src/lib/realtime'
import type { BookingInput } from '../src/lib/data/contracts'

test('assigns a table atomically, emits the booking, and frees the table on cancellation', async () => {
  expect(await mockData.getBusinesses()).toHaveLength(20)
  const date = dateInIndia()
  const input: BookingInput = {
    service: 'restaurant', business_id: 'r-00', date, time: '12:30', party_size: 8,
    name: 'Sample guest', phone: '', language: 'hi', source: 'vaani_call',
  }
  const ids: string[] = []
  const unsubscribe = getRealtimeSource().subscribeBookings(input.business_id, date, booking => ids.push(booking.booking_id))
  try {
    const attempts = await Promise.allSettled([mockData.simulateBooking(input), mockData.simulateBooking(input)])
    const winner = attempts.find(attempt => attempt.status === 'fulfilled')
    expect(attempts.filter(attempt => attempt.status === 'fulfilled')).toHaveLength(1)
    if (!winner) throw new Error('Expected one booking to succeed.')
    const booking = winner.value
    expect(ids).toEqual([booking.booking_id])
    expect(booking.status).toBe('pending_payment')
    expect((await mockData.getRestaurantSlots(input.business_id, date))[0].booked_table_ids).toEqual(['T5'])
    await mockData.patchBooking(booking.booking_id, { status: 'cancelled' })
    expect((await mockData.getRestaurantSlots(input.business_id, date))[0].booked_table_ids).toEqual([])
  } finally {
    unsubscribe()
  }
})
