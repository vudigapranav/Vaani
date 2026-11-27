const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
})

export function dateInIndia(offset = 0, now = new Date()): string {
  const midnight = new Date(dayFormatter.format(now) + 'T00:00:00Z')
  midnight.setUTCDate(midnight.getUTCDate() + offset)
  return midnight.toISOString().slice(0, 10)
}

export function timeLabel(time: string, locale = 'en-IN') {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
  }).format(new Date('2000-01-01T' + time + ':00Z'))
}
