const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
    t.setUTCMinutes(curMin + (n - (curMin % n)), 0, 0)
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
    t.setUTCHours(curHour + (remainder === 0 ? n : n - remainder), 0, 0, 0)
    return t
  }

  const h = parseInt(hour, 10)
  const m = parseInt(minute, 10)
  if (isNaN(h) || isNaN(m) || dom !== '*' || month !== '*') return null

  for (let d = 0; d <= 7; d++) {
    const c = new Date(from)
    c.setUTCDate(c.getUTCDate() + d)
    c.setUTCHours(h, m, 0, 0)
    if (c.getTime() <= from.getTime()) continue
    if (dow === '*') return c
    if (dow === '1-5') {
      const day = c.getUTCDay()
      if (day >= 1 && day <= 5) return c
    } else if (/^\d+$/.test(dow)) {
      if (c.getUTCDay() === parseInt(dow, 10)) return c
    }
  }

  return null
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

  const h = parseInt(hour, 10)
  const m = parseInt(minute, 10)
  if (isNaN(h) || isNaN(m) || dom !== '*' || month !== '*') return expr

  const time = formatTime(h, m)

  if (dow === '1-5') return `Weekdays at ${time} UTC`
  if (/^\d+$/.test(dow)) return `Every ${DAYS[+dow] ?? dow} at ${time} UTC`
  if (dow === '*') return `Daily at ${time} UTC`

  return expr
}
