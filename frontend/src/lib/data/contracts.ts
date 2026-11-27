import type { Booking, Call, Doctor, DoctorSlot, EvalResults, Hospital, Restaurant, RestaurantSlot, Service } from '@/types'

export type BookingInput = Omit<Booking, 'booking_id' | 'status' | 'created_at'>
export interface SlotBlock {
  resourceId: string
  date: string
  time?: string
  businessId?: string
  blocked: boolean
}
export interface DataSource {
  getBusinesses(filters?: { area?: string; type?: Service }): Promise<(Restaurant | Hospital)[]>
  getRestaurant(idOrSlug: string): Promise<Restaurant | undefined>
  getRestaurantSlots(id: string, date: string): Promise<RestaurantSlot[]>
  getHospital(idOrSlug: string): Promise<(Hospital & { doctors: Doctor[] }) | undefined>
  getDoctorSlots(doctorId: string, date: string): Promise<DoctorSlot[]>
  getBooking(id: string): Promise<Booking | undefined>
  getPartnerBookings(id: string, date: string): Promise<Booking[]>
  patchBooking(id: string, patch: Pick<Booking, 'status'>): Promise<Booking>
  payBooking(id: string): Promise<Booking>
  blockSlot(block: SlotBlock): Promise<void>
  setDoctorLeave(id: string, date: string, onLeave: boolean, businessId?: string): Promise<void>
  simulateBooking(input: BookingInput): Promise<Booking>
  getCalls(): Promise<Call[]>
  getCall(id: string): Promise<Call | undefined>
  getEval(): Promise<EvalResults>
}
