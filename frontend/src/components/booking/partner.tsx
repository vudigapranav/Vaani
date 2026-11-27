'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { getDataSource } from '@/lib/data'
import { businessPath, businessesId, statusText } from '@/lib/data/booking-view'
import { isLive, partnerCode, setPartnerCode } from '@/lib/data/session'
import { useResource } from '@/lib/data/use-resource'
import { dateInIndia, timeLabel } from '@/lib/dates'
import { getRealtimeSource } from '@/lib/realtime'
import { subscribeDatabase } from '@/lib/realtime/database'
import type { Booking, Doctor, Hospital, Restaurant, Service } from '@/types'
import { action, BookingLayout, DateField, field, Message, panel, secondary, title } from './common'

const data = getDataSource()
const refreshMs = isLive ? 1500 : 0
const simulateEnabled = !isLive || process.env.NEXT_PUBLIC_DEV_SIMULATE === 'true'
type Business = Restaurant | (Hospital & { doctors: Doctor[] })
type Run = (job: () => Promise<unknown>) => void

export function PartnerLogin() {
  const { value, error } = useResource(data.getBusinesses)
  const [id, setId] = useState('')
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function signIn(event: FormEvent) {
    event.preventDefault()
    const business = value?.find(item => businessesId(item) === id)
    if (!business) return
    setBusy(true)
    setNotice('')
    try {
      if (!isLive && code !== '000000') throw new Error('Enter the mock passcode shown below.')
      setPartnerCode(id, code)
      await data.getPartnerBookings(id, dateInIndia())
      router.push(businessPath(business, true))
    } catch (error) {
      setPartnerCode(id, null)
      setNotice(error instanceof Error ? error.message : 'Could not sign in.')
    } finally { setBusy(false) }
  }

  return <BookingLayout>
    <h1 className={title}>Partner sign-in</h1>
    <Message error={error}><form className={panel + ' max-w-md space-y-4'} onSubmit={signIn}>
      <label className="grid gap-2">Business<select className={field} value={id} onChange={event => setId(event.target.value)} required><option value="">Select a business</option>{value?.map(item => <option key={businessesId(item)} value={businessesId(item)}>{item.name}</option>)}</select></label>
      <label className="grid gap-2">Passcode<input type="password" inputMode="numeric" autoComplete="off" className={field} value={code} onChange={event => setCode(event.target.value)} required pattern="[0-9]{6}" /></label>
      {!isLive && <p>Mock passcode <code>000000</code></p>}
      <button className={action} disabled={busy}>Open portal</button>
      {notice && <p role="alert">{notice}</p>}
    </form></Message>
  </BookingLayout>
}

export function PartnerPage({ service, slug, tv }: { service: Service; slug: string; tv: boolean }) {
  const load = useCallback((): Promise<Business | undefined> => service === 'restaurant' ? data.getRestaurant(slug) : data.getHospital(slug), [service, slug])
  const { value, error, loading } = useResource(load)
  const id = value && businessesId(value)
  const authorized = useResource(useCallback(async () => id ? Boolean(partnerCode(id)) : false, [id]))
  if (!value) return <BookingLayout><Message error={error}><p>{loading ? 'Loading portal…' : 'Business not found.'}</p></Message></BookingLayout>
  if (authorized.loading) return <BookingLayout><p>Checking partner session…</p></BookingLayout>
  if (!authorized.value) return <BookingLayout><Link className={action} href="/partner/login">Sign in to open this portal</Link></BookingLayout>
  return <Portal business={value} tv={tv} />
}

function Portal({ business, tv }: { business: Business; tv: boolean }) {
  const id = businessesId(business)
  const [date, setDate] = useState(() => dateInIndia())
  const load = useCallback(() => data.getPartnerBookings(id, date), [id, date])
  const { value: bookings, error, refresh } = useResource(load, refreshMs)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [newBooking, setNewBooking] = useState<Booking>()
  const seen = useRef<{ date: string; ids: Set<string> }>(null)
  const sound = useRef<AudioContext>(null)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const router = useRouter()

  useEffect(() => isLive
    ? subscribeDatabase('bookings', 'business_id=eq.' + id, refresh)
    : getRealtimeSource().subscribeBookings(id, date, refresh), [id, date, refresh])
  useEffect(() => {
    if (!bookings) return
    const previous = seen.current
    const ids = new Set(bookings.map(booking => booking.booking_id))
    seen.current = { date, ids }
    if (previous?.date !== date) return
    const latest = bookings.find(item => !previous.ids.has(item.booking_id) && item.status !== 'cancelled')
    if (!latest) return
    const event = window.setTimeout(() => setNewBooking(latest), 0)
    const audio = sound.current
    if (audio?.state === 'running') {
      const note = audio.createOscillator()
      const volume = audio.createGain()
      note.frequency.setValueAtTime(660, audio.currentTime)
      volume.gain.setValueAtTime(.09, audio.currentTime)
      volume.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .25)
      note.connect(volume).connect(audio.destination)
      note.start()
      note.stop(audio.currentTime + .25)
    }
    return () => clearTimeout(event)
  }, [bookings, date])
  useEffect(() => () => { if (sound.current) void sound.current.close() }, [])

  async function run(job: () => Promise<unknown>) {
    setBusy(true)
    setNotice('')
    try {
      await job()
      refresh()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update the portal.')
    } finally { setBusy(false) }
  }

  const active = (bookings ?? []).filter(item => item.status !== 'cancelled')
  const restaurant = 'restaurant_id' in business
  const destination = businessPath(business, true)
  return <BookingLayout>
    <header className="space-y-3" data-tv={tv ? 'true' : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-live">{isLive ? 'Auto-refreshing' : 'Mock sync'}</p>
        <div className="flex flex-wrap gap-2">
          <button className={secondary} aria-pressed={soundEnabled} onClick={() => {
            if (sound.current && soundEnabled) { void sound.current.suspend(); setSoundEnabled(false); return }
            if (!sound.current) sound.current = new AudioContext()
            void sound.current.resume().then(() => setSoundEnabled(true)).catch(() => setNotice('Sound is unavailable.'))
          }}>{soundEnabled ? 'Mute chime' : 'Enable sound'}</button>
          <Link className={secondary} href={tv ? destination : destination + '?tv=1'}>{tv ? 'Exit TV mode' : 'TV mode'}</Link>
          {!tv && <button className={secondary} onClick={() => { setPartnerCode(id, null); router.push('/partner/login') }}>Sign out</button>}
        </div>
      </div>
      <h1 className={title}>{business.name}</h1>
      {!tv && <DateField date={date} change={setDate} />}
    </header>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className={panel}><strong className="text-3xl">{active.length}</strong><p>{restaurant ? 'Reservations' : 'Appointments'}</p></div>
      <div className={panel}><strong className="text-3xl">{restaurant ? active.reduce((total, row) => total + (row.party_size ?? 0), 0) : active.filter(row => row.payment_status === 'paid' || row.status === 'paid').length}</strong><p>{restaurant ? 'Covers' : 'Paid visits'}</p></div>
      <div className={panel}><strong className="text-3xl">{active.filter(row => row.status === 'arrived' || row.status === 'checked_in').length}</strong><p>{restaurant ? 'Arrivals' : 'Checked in'}</p></div>
    </div>
    <div aria-live="polite">{newBooking?.date === date && <div className={panel + ' border-live'}>New booking · {newBooking.name} · {timeLabel(newBooking.time)} · <Link href={'/b/' + newBooking.booking_id}>{newBooking.booking_id}</Link></div>}</div>
    <Message error={error}>
      {restaurant
        ? <RestaurantSchedule restaurant={business} date={date} bookings={active} tv={tv} busy={busy} run={run} />
        : <div className="grid gap-3 md:grid-cols-2">{business.doctors.map(doctor => <DoctorSchedule key={doctor.doctor_id} doctor={doctor} date={date} bookings={active} tv={tv} busy={busy} run={run} />)}</div>}
      <section className={panel}>
        <h2 className="mb-3 font-display text-2xl">Bookings</h2>
        <ul className="divide-y divide-border">{[...(bookings ?? [])].sort((a, b) => a.time.localeCompare(b.time)).map(row => <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={row.booking_id}>
          <div><p className="font-semibold">{timeLabel(row.time)} · {row.name} {row.table_id && '· ' + row.table_id}</p><p>{statusText[row.status]} · {row.source === 'vaani_call' ? 'Vaani call' : row.source} · {row.language.toUpperCase()}</p></div>
          {!tv && <div className="flex flex-wrap items-center gap-2">
            <Link className={secondary} href={'/b/' + row.booking_id}>{row.booking_id}</Link>
            {row.call_id && <Link className={secondary} href={'/calls/' + row.call_id}>Call log</Link>}
            {row.status !== 'cancelled' && <>
              {row.status !== 'arrived' && row.status !== 'checked_in' && <button disabled={busy} className={secondary} onClick={() => void run(() => data.patchBooking(row.booking_id, { status: restaurant ? 'arrived' : 'checked_in' }))}>{restaurant ? 'Mark arrived' : 'Check in'}</button>}
              <button disabled={busy} className={secondary} onClick={() => { if (window.confirm('Cancel this booking?')) void run(() => data.patchBooking(row.booking_id, { status: 'cancelled' })) }}>Cancel</button>
            </>}
          </div>}
        </li>)}</ul>
        {!bookings?.length && <p>{bookings ? 'No bookings for this date.' : 'Loading bookings…'}</p>}
      </section>
    </Message>
    {notice && <p className={panel} role="alert">{notice}</p>}
  </BookingLayout>
}

function RestaurantSchedule({ restaurant, date, bookings, tv, busy, run }: {
  restaurant: Restaurant; date: string; bookings: Booking[]; tv: boolean; busy: boolean; run: Run
}) {
  const id = restaurant.restaurant_id
  const [time, setTime] = useState('')
  const load = useCallback(() => data.getRestaurantSlots(id, date), [id, date])
  const { value, error, refresh } = useResource(load, refreshMs)
  useEffect(() => isLive
    ? subscribeDatabase('restaurant_slots', 'restaurant_id=eq.' + id, refresh)
    : getRealtimeSource().subscribeSlots(id, date, refresh), [id, date, refresh])
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())
  const slot = (tv ? value?.find(row => row.time >= clock) : value?.find(row => row.time === time)) ?? value?.[0]
  return <section className={panel + ' space-y-3'}>
    <h2 className="font-display text-2xl">Floor plan</h2>
    <Message error={error}>{slot ? <>
      {!tv && <label>Time <select className={field} value={slot.time} onChange={event => setTime(event.target.value)}>{value?.map(row => <option key={row.time} value={row.time}>{timeLabel(row.time)}</option>)}</select></label>}
      {tv && <p>{timeLabel(slot.time)} IST</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {restaurant.tables.map(table => {
          const row = bookings.find(item => item.time === slot.time && item.table_id === table.table_id)
          return <div key={table.table_id} className={'rounded-lg border p-3 ' + (row ? 'border-primary' : 'border-border')}><strong>{table.table_id}</strong> · {table.capacity} seats<p>{row ? statusText[row.status] : slot.blocked ? 'Blocked' : 'Free'}</p></div>
        })}
      </div>
      {!tv && <div className="flex flex-wrap gap-2">
        <button className={secondary} disabled={busy} onClick={() => run(() => data.blockSlot({ resourceId: id, date, time: slot.time, blocked: !slot.blocked }))}>{slot.blocked ? 'Unblock slot' : 'Block slot'}</button>
        <button className={secondary} disabled={busy} onClick={() => run(() => data.blockSlot({ resourceId: id, date, blocked: !value?.every(row => row.blocked) }))}>{value?.every(row => row.blocked) ? 'Reopen day' : 'Close day'}</button>
        {simulateEnabled && <button className={action} disabled={busy || slot.blocked || slot.past} onClick={() => run(() => data.simulateBooking({ service: 'restaurant', business_id: id, date, time: slot.time, party_size: 2, name: 'Sample guest', phone: '', language: 'hi', source: 'vaani_call' }))}>Simulate booking</button>}
      </div>}
    </> : <p>{value ? 'No table slots for this date.' : 'Loading schedule…'}</p>}</Message>
  </section>
}

function DoctorSchedule({ doctor, date, bookings, tv, busy, run }: { doctor: Doctor; date: string; bookings: Booking[]; tv: boolean; busy: boolean; run: Run }) {
  const id = doctor.doctor_id
  const hospital = doctor.hospital_id
  const load = useCallback(() => data.getDoctorSlots(id, date), [id, date])
  const { value, error, refresh } = useResource(load, refreshMs)
  useEffect(() => isLive
    ? subscribeDatabase('doctor_slots', 'doctor_id=eq.' + id, refresh)
    : getRealtimeSource().subscribeSlots(id, date, refresh), [id, date, refresh])
  const [time, setTime] = useState('')
  const slot = value?.find(row => row.time === time) ?? value?.[0]
  const onLeave = value?.some(row => row.on_leave) ?? false
  const simulate = () => slot && run(() => data.simulateBooking({ service: 'hospital', business_id: hospital, doctor_id: id, date, time: slot.time, name: 'Sample patient', phone: '', language: 'te', source: 'vaani_call' }))
  return <section className={panel + ' space-y-3'}>
    <h2 className="font-display text-2xl">{doctor.name}</h2><p>{doctor.speciality}{onLeave && ' · On leave'}</p>
    <Message error={error}><ul>{bookings.filter(row => row.doctor_id === id).map(row => <li key={row.booking_id}>{timeLabel(row.time)} · {row.name} · {statusText[row.status]}</li>)}</ul>
      {!tv && slot && <div className="flex flex-wrap gap-2">
        <select aria-label={'Time for ' + doctor.name} className={field} value={slot.time} onChange={event => setTime(event.target.value)}>{value?.map(row => <option key={row.time} value={row.time}>{timeLabel(row.time)} · {row.status}</option>)}</select>
        <button className={secondary} disabled={busy || onLeave || slot.status === 'booked'} onClick={() => run(() => data.blockSlot({ resourceId: id, businessId: hospital, date, time: slot.time, blocked: slot.status !== 'blocked' }))}>{slot.status === 'blocked' ? 'Unblock' : 'Block'}</button>
        <button className={secondary} disabled={busy} onClick={() => run(() => data.setDoctorLeave(id, date, !onLeave, hospital))}>{onLeave ? 'End leave' : 'Mark on leave'}</button>
        {simulateEnabled && <button disabled={busy || slot.status !== 'free' || slot.past} className={action} onClick={simulate}>Simulate booking</button>}
      </div>}
    </Message>
  </section>
}
