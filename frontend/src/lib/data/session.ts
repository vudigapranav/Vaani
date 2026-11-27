const prefix = 'vaani-partner:'
export const isLive = process.env.NEXT_PUBLIC_DATA_MODE === 'live'

export function partnerCode(id: string) {
  return typeof window === 'undefined' ? null : sessionStorage.getItem(prefix + id)
}

export function setPartnerCode(id: string, code: string | null) {
  if (code === null) sessionStorage.removeItem(prefix + id)
  else sessionStorage.setItem(prefix + id, code)
}
