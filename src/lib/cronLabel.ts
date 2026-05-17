const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
