const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Parses a comma-separated day-of-week list (e.g. '1,3,5') into deduped day numbers,
// or null if any token isn't a valid 0-6 digit.
function parseDayList(dow: string): number[] | null {
  const tokens = dow.split(',')
  const days: number[] = []
  for (const t of tokens) {
    if (!/^\d+$/.test(t)) return null
    const n = parseInt(t, 10)
    if (n > 6) return null
    if (!days.includes(n)) days.push(n)
  }
  return days
}

export function nextCronRun(expr: string, from: Date = new Date()): Date | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [minute, hour, dom, month, dow] = parts

  // Every N minutes: */N * * * *
  if (minute.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(minute.slice(2), 10)
    if (isNaN(n) || n < 1 || n > 59) return null
    const t = new Date(from)
    t.setUTCSeconds(0, 0)
    t.setUTCMinutes(t.getUTCMinutes() + 1)
    if (t.getUTCMinutes() % n === 0) return t
    const curMin = t.getUTCMinutes()
    const target = curMin + (n - (curMin % n))
    if (target >= 60) {
      t.setUTCHours(t.getUTCHours() + 1, 0, 0, 0)
    } else {
      t.setUTCMinutes(target, 0, 0)
    }
    return t
  }

  // Every N hours: 0 */N * * *
  if (minute === '0' && hour.startsWith('*/') && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(hour.slice(2), 10)
    if (isNaN(n) || n < 1 || n > 23) return null
    const t = new Date(from)
    t.setUTCSeconds(0, 0)
    t.setUTCMinutes(t.getUTCMinutes() + 1)
    if (t.getUTCMinutes() === 0 && t.getUTCHours() % n === 0) return t
    const curHour = t.getUTCHours()
    const remainder = curHour % n
    const target = curHour + (remainder === 0 ? n : n - remainder)
    if (target >= 24) {
      t.setUTCDate(t.getUTCDate() + 1)
      t.setUTCHours(0, 0, 0, 0)
    } else {
      t.setUTCHours(target, 0, 0, 0)
    }
    return t
  }

  if (!/^\d+$/.test(hour) || !/^\d+$/.test(minute)) return null
  const h = parseInt(hour, 10)
  const m = parseInt(minute, 10)
  if (h > 23 || m > 59 || dom !== '*' || month !== '*') return null

  const dowList = dow.includes(',') ? parseDayList(dow) : null
  if (dow.includes(',') && !dowList) return null

  for (let d = 0; d <= 7; d++) {
    const c = new Date(from)
    c.setUTCDate(c.getUTCDate() + d)
    c.setUTCHours(h, m, 0, 0)
    if (c.getTime() <= from.getTime()) continue
    if (dow === '*') return c
    if (dow === '1-5') {
      const day = c.getUTCDay()
      if (day >= 1 && day <= 5) return c
    } else if (dowList) {
      if (dowList.includes(c.getUTCDay())) return c
    } else if (/^\d+$/.test(dow)) {
      const dowNum = parseInt(dow, 10)
      if (c.getUTCDay() === (dowNum === 7 ? 0 : dowNum)) return c
    }
  }

  return null
}

export function nextCronRuns(expr: string, count: number, from: Date = new Date()): Date[] {
  const results: Date[] = []
  let cursor = from
  for (let i = 0; i < count; i++) {
    const next = nextCronRun(expr, cursor)
    if (!next) break
    results.push(next)
    cursor = next
  }
  return results
}

function isValidCronField(field: string, min: number, max: number): boolean {
  if (field === '*') return true
  if (field.startsWith('*/')) {
    const n = parseInt(field.slice(2), 10)
    return !isNaN(n) && n >= 1 && n <= max
  }
  const rangeParts = field.split('-')
  if (rangeParts.length === 2 && rangeParts.every((p) => /^\d+$/.test(p))) {
    const [a, b] = rangeParts.map(Number)
    return a >= min && b <= max && a <= b
  }
  if (field.includes(',')) {
    return field
      .split(',')
      .every((t) => /^\d+$/.test(t) && parseInt(t, 10) >= min && parseInt(t, 10) <= max)
  }
  if (/^\d+$/.test(field)) {
    const n = parseInt(field, 10)
    return n >= min && n <= max
  }
  return false
}

export function isValidCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return false
  const [minute, hour, dom, month, dow] = parts
  // Reject comma-separated minute/hour: UI can't preview next-fire time for multi-value fields
  if (minute.includes(',') || hour.includes(',')) return false
  return (
    isValidCronField(minute, 0, 59) &&
    isValidCronField(hour, 0, 23) &&
    isValidCronField(dom, 1, 31) &&
    isValidCronField(month, 1, 12) &&
    isValidCronField(dow, 0, 7)
  )
}

export function formatRelativeTime(future: Date, from: Date = new Date()): string {
  const diffMs = future.getTime() - from.getTime()
  if (diffMs <= 0) return 'now'
  const diffMins = Math.round(diffMs / 60000)
  if (diffMins < 60) return `in ${diffMins} minute${diffMins === 1 ? '' : 's'}`
  const diffHours = Math.round(diffMins / 60)
  if (diffHours < 24) return `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`
  const diffDays = Math.round(diffHours / 24)
  return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`
}

function formatTime(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return expr
  const [minute, hour, dom, month, dow] = parts

  if (minute.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(minute.slice(2), 10)
    return `Every ${n} minute${n === 1 ? '' : 's'}`
  }

  if (minute === '0' && hour.startsWith('*/') && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(hour.slice(2), 10)
    return `Every ${n} hour${n === 1 ? '' : 's'}`
  }

  if (!/^\d+$/.test(hour) || !/^\d+$/.test(minute) || dom !== '*' || month !== '*') return expr
  const h = parseInt(hour, 10)
  const m = parseInt(minute, 10)

  const time = formatTime(h, m)

  if (dow === '1-5') return `Weekdays at ${time} UTC`
  if (/^\d+$/.test(dow)) return `Every ${DAYS[+dow % 7] ?? dow} at ${time} UTC`
  if (dow === '*') return `Daily at ${time} UTC`
  if (dow.includes(',')) {
    const days = parseDayList(dow)
    if (days) return `Every ${days.map((d) => DAYS[d]).join(', ')} at ${time} UTC`
  }

  return expr
}
