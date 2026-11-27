'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { getDataSource } from '@/lib/data'
import { businessKind, businessPath, businessesId, money, statusText } from '@/lib/data/booking-view'
import { isLive } from '@/lib/data/session'
import { useResource } from '@/lib/data/use-resource'
import { dateInIndia, timeLabel } from '@/lib/dates'
import { getRealtimeSource } from '@/lib/realtime'
import { subscribeDatabase } from '@/lib/realtime/database'
import type { Booking, Doctor, Hospital, Restaurant, Service } from '@/types'
import { action, BookingLayout, CallLinks, DateField, field, Message, panel, secondary, title } from './common'

const data = getDataSource()
const refreshMs = isLive ? 1500 : 0
const areaLabel = (id: string) => id.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())

export function Directory() {
  const [service, setService] = useState<Service | ''>('')
  const [area, setArea] = useState('')
  const results = useResource(data.getBusinesses)
  const businesses = results.value ?? []
  const shown = businesses.filter(item => (!service || businessKind(item) === service) && (!area || item.area_id === area))
  return <BookingLayout>
    <h1 className={title}>Explore Hyderabad</h1>
    <div className="flex flex-wrap gap-4">
      <label>Service <select className={field} value={service} onChange={event => setService(event.target.value as typeof service)}><option value="">All services</option><option value="restaurant">Restaurants</option><option value="hospital">Hospitals</option></select></label>
      <label>Area <select className={field} value={area} onChange={event => setArea(event.target.value)}><option value="">All areas</option>{[...new Set(businesses.map(item => item.area_id))].map(id => <option key={id} value={id}>{areaLabel(id)}</option>)}</select></label>
    </div>
    <Message error={results.error}>{results.value ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map(item => <Link key={businessesId(item)} href={businessPath(item)} className={panel + ' block hover:border-primary'}>
        <p className="text-sm text-muted-foreground">{areaLabel(item.area_id)} · {businessKind(item)}</p>
        <h2 className="my-2 font-display text-2xl font-semibold">{item.name}</h2><p>{item.highlight}</p>
      </Link>)}
      {!shown.length && <p>No businesses match these filters.</p>}
    </div> : <p role="status">Loading businesses…</p>}</Message>
    <p className="text-sm text-muted-foreground">Sample data for a hackathon demo.</p>
  </BookingLayout>
}

function RestaurantAvailability({ restaurant, date }: { restaurant: Restaurant; date: string }) {
  const id = restaurant.restaurant_id
  const load = useCallback(() => data.getRestaurantSlots(id, date), [id, date])
  const { value, error, refresh } = useResource(load, refreshMs)
  useEffect(() => isLive
    ? subscribeDatabase('restaurant_slots', 'restaurant_id=eq.' + id, refresh)
    : getRealtimeSource().subscribeSlots(id, date, refresh), [id, date, refresh])
  return <section className={panel}>
    <h2 className="mb-3 font-display text-2xl">Table availability</h2>
    <Message error={error}><div className="flex flex-wrap gap-2" aria-live="polite">
      {value?.map(slot => {
        const free = slot.blocked ? 0 : slot.free_tables ?? restaurant.tables.length - slot.booked_table_ids.length
        return <span key={slot.time} className={secondary}>{timeLabel(slot.time)} · {slot.past ? 'Past' : free ? free + ' free' : 'Full'}</span>
      })}
      {value?.length === 0 && <p>No slots on this date.</p>}
      {!value && <p>Loading slots…</p>}
    </div></Message>
  </section>
}

function DoctorAvailability({ doctor, date }: { doctor: Doctor; date: string }) {
  const id = doctor.doctor_id
  const load = useCallback(() => data.getDoctorSlots(id, date), [id, date])
  const { value, error, refresh } = useResource(load, refreshMs)
  useEffect(() => isLive
    ? subscribeDatabase('doctor_slots', 'doctor_id=eq.' + id, refresh)
    : getRealtimeSource().subscribeSlots(id, date, refresh), [id, date, refresh])
  const available = value?.filter(slot => slot.status === 'free' && !slot.past)
  return <article className={panel}>
    <h3 className="font-display text-2xl">{doctor.name}</h3>
    <p>{doctor.speciality} · {doctor.qualification} · {money(doctor.consultation_fee_inr)}</p>
    <p className="text-sm text-muted-foreground">{doctor.schedule}</p>
    <Message error={error}><p className="mt-3" aria-live="polite">{available ? available.map(slot => timeLabel(slot.time)).join(' · ') || 'No appointments available' : 'Loading appointments…'}</p></Message>
  </article>
}

type Business = Restaurant | (Hospital & { doctors: Doctor[] })

export function BusinessPage({ service, slug }: { service: Service; slug: string }) {
  const load = useCallback((): Promise<Business | undefined> => service === 'restaurant' ? data.getRestaurant(slug) : data.getHospital(slug), [service, slug])
  const { value: business, error, loading } = useResource(load)
  const [date, setDate] = useState(() => dateInIndia())
  if (!business) return <BookingLayout><Message error={error}><p role="status">{loading ? 'Loading business…' : 'Business not found.'}</p></Message><Link href="/explore">Browse businesses</Link></BookingLayout>
  return <BookingLayout>
    <p className="text-sm text-muted-foreground">{areaLabel(business.area_id)} · Sample rating {business.rating}</p>
    <h1 className={title}>{business.name}</h1><p>{business.highlight}</p>
    <p>{business.address} · {'opening_hours' in business ? business.opening_hours : business.opd_hours}</p>
    <CallLinks />
    <DateField date={date} change={setDate} />
    {'restaurant_id' in business ? <>
      <p>{business.cuisines.join(' · ')} · {money(business.price_for_two_inr)} for two</p>
      <p>{business.popular_dishes.join(' · ')}</p>
      <RestaurantAvailability restaurant={business} date={date} />
    </> : <section className="space-y-3">
      <h2 className="font-display text-2xl">Doctors and appointments</h2>
      <p className="rounded-lg border border-red-700 bg-red-50 p-3 text-red-900">Emergency? Call <a className="underline" href="tel:108">108</a> or <a className="underline" href="tel:112">112</a>.</p>
      <p>{business.specialities.join(' · ')}</p>
      {business.doctors.map(doctor => <DoctorAvailability key={doctor.doctor_id} doctor={doctor} date={date} />)}
    </section>}
    <section className="space-y-2"><h2 className="font-display text-2xl">FAQs</h2>{business.faqs.map(faq => <details className={panel} key={faq.q}><summary>{faq.q}</summary>{faq.a_en}</details>)}</section>
    <p className="text-sm text-muted-foreground">Sample data for a hackathon demo.</p>
  </BookingLayout>
}

function calendar(booking: Booking) {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '')
  const start = new Date(booking.date + 'T' + booking.time + ':00+05:30')
  const id = booking.booking_id.replace(/[^\w-]/g, '')
  const content = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vaani//Booking//EN',
    'BEGIN:VEVENT', 'UID:' + id + '@vaani', 'DTSTAMP:' + stamp(new Date()),
    'DTSTART:' + stamp(start), 'SUMMARY:Vaani booking ' + id,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
  const href = URL.createObjectURL(new Blob([content], { type: 'text/calendar' }))
  const link = document.createElement('a')
  link.href = href
  link.download = id + '.ics'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(href), 1000)
}

export function BookingPage({ id, payment = false }: { id: string; payment?: boolean }) {
  const load = useCallback(() => data.getBooking(id), [id])
  const { value: booking, error, refresh, loading } = useResource(load, refreshMs)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const businessId = booking?.business_id
  useEffect(() => {
    if (isLive) return subscribeDatabase('bookings', 'booking_id=eq.' + id, refresh)
    if (!businessId) return
    return getRealtimeSource().subscribeBookings(businessId, undefined, updated => {
      if (updated.booking_id === id) refresh()
    })
  }, [businessId, id, refresh])

  async function update(pay: boolean) {
    setBusy(true)
    setNotice('')
    try {
      if (pay) await data.payBooking(id)
      else await data.patchBooking(id, { status: 'cancelled' })
      refresh()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Request failed.')
    } finally { setBusy(false) }
  }

  return <BookingLayout>
    <h1 className={title}>{payment ? 'Test payment' : 'Booking status'}</h1>
    <Message error={error}>{booking ? <section className={panel + ' space-y-3'}>
      <p className="font-mono">{booking.booking_id}</p>
      <h2 className="font-display text-2xl">{booking.name}</h2>
      <p>{booking.date} · {timeLabel(booking.time)} IST · {booking.service}</p>
      <p role="status">{statusText[booking.status]}</p>
      {payment && <p>{money(booking.payments?.at(-1)?.amount_inr ?? booking.amount_due_inr ?? 0)}</p>}
      <div className="flex flex-wrap gap-2">
        {booking.status === 'pending_payment' && (payment
          ? <button className={action} disabled={busy} onClick={() => void update(true)}>Pay (test)</button>
          : <Link className={action} href={'/pay/' + id}>Pay now</Link>)}
        {payment && <Link className={secondary} href={'/b/' + id}>Booking status</Link>}
        {!payment && booking.status !== 'cancelled' && <button className={secondary} onClick={() => calendar(booking)}>Add to calendar</button>}
        {!payment && booking.status !== 'cancelled' && <button className={secondary} disabled={busy} onClick={() => { if (window.confirm('Cancel this booking?')) void update(false) }}>Cancel booking</button>}
      </div>
      {notice && <p role="alert">{notice}</p>}
    </section> : <p>{loading ? 'Loading booking…' : 'No booking to display for ' + id + '.'}</p>}</Message>
  </BookingLayout>
}
