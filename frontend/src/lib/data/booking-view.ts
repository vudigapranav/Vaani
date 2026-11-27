import type { Booking, Hospital, Restaurant } from '@/types'

export const businessesId = (business: Restaurant | Hospital) =>
  'restaurant_id' in business ? business.restaurant_id : business.hospital_id

export const businessKind = (business: Restaurant | Hospital) =>
  'restaurant_id' in business ? 'restaurant' : 'hospital'

export const businessPath = (business: Restaurant | Hospital, partner = false) =>
  (partner ? '/partner' : '') + ('restaurant_id' in business ? '/r/' : '/h/') + business.slug

export const money = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

export const statusText: Record<Booking['status'], string> = {
  confirmed: 'Confirmed', pending_payment: 'Payment due', paid: 'Paid',
  arrived: 'Arrived', checked_in: 'Checked in', cancelled: 'Cancelled',
}
