export type Language = 'en' | 'hi' | 'te'
export type Service = 'restaurant' | 'hospital'
export interface Area {
  area_id: string
  name_en: string
  name_te: string
  name_hi: string
  aliases: string[]
  lat: number
  lng: number
  nearby_unsupported_areas: string[]
}
export interface Faq { q: string; a_en: string; a_hi: string; a_te: string }
interface BusinessFields {
  slug: string
  name: string
  name_spoken_te: string
  name_spoken_hi: string
  name_aliases: string[]
  area_id: string
  address: string
  rating: number
  highlight: string
  faqs: Faq[]
  accent_color?: string
  is_sample_data: boolean
}
export interface Restaurant extends BusinessFields {
  restaurant_id: string
  cuisines: string[]
  food_type: 'veg' | 'non-veg' | 'both'
  price_for_two_inr: number
  popular_dishes: string[]
  opening_hours: string
  features: Record<'parking' | 'outdoor_seating' | 'kids_friendly' | 'wheelchair_access' | 'live_music', boolean>
  booking_rules: {
    max_party_size: number
    deposit_required_for_party_size_at_least: number
    deposit_inr: number
    cancellation: string
  }
  tables: { table_id: string; capacity: number }[]
  slot_length_minutes: number
}
export interface Hospital extends BusinessFields {
  hospital_id: string
  type: string
  specialities: string[]
  facilities: Record<'emergency_24x7' | 'pharmacy' | 'lab' | 'ambulance' | 'cashless_insurance' | 'wheelchair_access', boolean>
  opd_hours: string
  languages_spoken: Language[]
}
export interface Doctor {
  doctor_id: string
  hospital_id: string
  name: string
  gender: string
  speciality: string
  qualification: string
  experience_years: number
  languages: Language[]
  consultation_fee_inr: number
  schedule: string
  slot_length_minutes: number
  on_leave_dates: string[]
}
export interface RestaurantSlot {
  restaurant_id: string
  date: string
  time: string
  booked_table_ids: string[]
  blocked: boolean
  free_tables?: number
  past?: boolean
}
export interface DoctorSlot {
  doctor_id: string
  date: string
  time: string
  status: 'free' | 'booked' | 'blocked'
  on_leave?: boolean
  past?: boolean
}
export interface Booking {
  booking_id: string
  service: Service
  business_id: string
  doctor_id?: string
  date: string
  time: string
  party_size?: number
  table_id?: string
  name: string
  phone: string
  language: Language
  source: 'vaani_call' | 'web' | 'walk_in'
  status: 'confirmed' | 'pending_payment' | 'paid' | 'arrived' | 'checked_in' | 'cancelled'
  call_id?: string
  created_at: string
  payment_status?: string
  payments?: Payment[]
  amount_due_inr?: number
}
export interface Payment {
  payment_id: string
  booking_id: string
  amount_inr: number
  provider: string
  provider_ref: string
  status: string
}
export interface TranscriptLine { speaker: 'caller' | 'ai'; text: string; lang: Language; ts: string }
export interface Latency { stt: number; llm_first_token: number; tts_first_audio: number; turn_total: number }
export interface Call {
  call_id: string
  channel: 'phone' | 'web'
  direction: string
  from_number: string
  started_at: string
  ended_at: string | null
  language: Language
  services_used: Service[]
  transcript: TranscriptLine[]
  outcome_json: Record<string, unknown>
  tool_timeline: { ts: string; tool: string; summary: string }[]
  latency_json: Latency[]
  recording_url?: string
  summary: string
}
type EventPayload = {
  call_started: { channel: Call['channel']; from_number: string }
  language_detected: { language: Language }
  agent_switched: { agent: 'router' | Service }
  slot_filled: { key: string; value: string }
  tool_called: { tool: string; summary: string }
  booking_created: { booking_id: string; business_id: string }
  payment_updated: Payment
  call_ended: { outcome: string }
  transcript: Omit<TranscriptLine, 'ts'> & { final: boolean }
  latency: Latency
}
export type CallEvent = {
  [Kind in keyof EventPayload]: {
    call_id: string
    ts: string
    type: Kind
    payload: EventPayload[Kind]
  }
}[keyof EventPayload]
export interface EvalResults {
  placeholder: boolean
  tests: { call_id: string; language: Language; passed: boolean; reason: string }[]
}
