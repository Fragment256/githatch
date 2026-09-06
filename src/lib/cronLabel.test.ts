import { describe, it, expect } from 'vitest'
import {
  describeCron,
  nextCronRun,
  formatRelativeTime,
  nextCronRuns,
  isValidCron,
} from './cronLabel'

describe('describeCron', () => {
  it('describes every-N-minutes patterns', () => {
    expect(describeCron('*/30 * * * *')).toBe('Every 30 minutes')
    expect(describeCron('*/1 * * * *')).toBe('Every 1 minute')
    expect(describeCron('*/15 * * * *')).toBe('Every 15 minutes')
  })

  it('describes every-N-hours patterns', () => {
    expect(describeCron('0 */6 * * *')).toBe('Every 6 hours')
    expect(describeCron('0 */1 * * *')).toBe('Every 1 hour')
    expect(describeCron('0 */12 * * *')).toBe('Every 12 hours')
  })

  it('describes daily patterns', () => {
    expect(describeCron('0 8 * * *')).toBe('Daily at 8 AM UTC')
    expect(describeCron('0 0 * * *')).toBe('Daily at 12 AM UTC')
    expect(describeCron('0 12 * * *')).toBe('Daily at 12 PM UTC')
    expect(describeCron('30 14 * * *')).toBe('Daily at 2:30 PM UTC')
  })

  it('describes weekday patterns', () => {
    expect(describeCron('0 9 * * 1-5')).toBe('Weekdays at 9 AM UTC')
    expect(describeCron('0 17 * * 1-5')).toBe('Weekdays at 5 PM UTC')
  })

  it('describes day-of-week patterns', () => {
    expect(describeCron('0 9 * * 1')).toBe('Every Monday at 9 AM UTC')
    expect(describeCron('0 9 * * 0')).toBe('Every Sunday at 9 AM UTC')
    expect(describeCron('0 9 * * 6')).toBe('Every Saturday at 9 AM UTC')
    expect(describeCron('0 20 * * 5')).toBe('Every Friday at 8 PM UTC')
    // DOW=7 is a GitHub Actions alias for Sunday
    expect(describeCron('0 9 * * 7')).toBe('Every Sunday at 9 AM UTC')
  })

  it('returns the raw expression for unrecognized patterns', () => {
    expect(describeCron('0 9 1 * *')).toBe('0 9 1 * *')
    expect(describeCron('0 9 * 6 *')).toBe('0 9 * 6 *')
    expect(describeCron('not a cron')).toBe('not a cron')
    expect(describeCron('* * * * * *')).toBe('* * * * * *')
  })

  it('returns the raw expression when fields are invalid', () => {
    expect(describeCron('abc def * * *')).toBe('abc def * * *')
  })

  it('returns the raw expression for comma-separated hour/minute lists instead of describing only the first value', () => {
    // '0 9,17 * * *' means 9 AM and 5 PM — describing it as "Daily at 9 AM UTC" would hide the 5 PM run
    expect(describeCron('0 9,17 * * *')).toBe('0 9,17 * * *')
    expect(describeCron('0,30 9 * * *')).toBe('0,30 9 * * *')
  })

  it('describes comma-separated day-of-week lists', () => {
    expect(describeCron('0 9 * * 1,3,5')).toBe('Every Monday, Wednesday, Friday at 9 AM UTC')
    expect(describeCron('0 9 * * 0,6')).toBe('Every Sunday, Saturday at 9 AM UTC')
  })

  it('returns the raw expression for invalid day-of-week lists', () => {
    expect(describeCron('0 9 * * 1,8')).toBe('0 9 * * 1,8')
    expect(describeCron('0 9 * * 1,')).toBe('0 9 * * 1,')
  })
})

describe('nextCronRun', () => {
  // Fixed reference point: Wednesday 2026-01-14 14:23:30 UTC
  const REF = new Date('2026-01-14T14:23:30Z')

  it('returns null for unrecognized patterns', () => {
    expect(nextCronRun('0 9 1 * *', REF)).toBeNull()
    expect(nextCronRun('not a cron', REF)).toBeNull()
    expect(nextCronRun('* * * * * *', REF)).toBeNull()
  })

  it('returns null for comma-separated hour/minute lists instead of silently using only the first value', () => {
    // parseInt('9,17', 10) === 9, so without explicit rejection this would silently compute
    // only the 9 AM occurrence and hide the 5 PM one
    expect(nextCronRun('0 9,17 * * *', REF)).toBeNull()
    expect(nextCronRun('0,30 9 * * *', REF)).toBeNull()
  })

  it('computes next fire for every-N-minutes pattern', () => {
    // from 14:23:30, next */30 is 14:30:00
    expect(nextCronRun('*/30 * * * *', REF)).toEqual(new Date('2026-01-14T14:30:00Z'))
    // from 14:30:00 exactly, next */30 is 15:00:00
    expect(nextCronRun('*/30 * * * *', new Date('2026-01-14T14:30:00Z'))).toEqual(
      new Date('2026-01-14T15:00:00Z'),
    )
    // from 23:55:00, next */10 is next day 00:00:00
    expect(nextCronRun('*/7 * * * *', new Date('2026-01-14T10:57:30Z'))).toEqual(
      new Date('2026-01-14T11:00:00Z'),
    )
    expect(nextCronRun('*/10 * * * *', new Date('2026-01-14T23:55:00Z'))).toEqual(
      new Date('2026-01-15T00:00:00Z'),
    )
  })

  it('computes next fire for every-N-hours pattern', () => {
    // from 14:23:30, next */6 is 18:00:00
    expect(nextCronRun('0 */6 * * *', REF)).toEqual(new Date('2026-01-14T18:00:00Z'))
    // from exactly 6:00:00, next */6 is 12:00:00
    expect(nextCronRun('0 */6 * * *', new Date('2026-01-14T06:00:00Z'))).toEqual(
      new Date('2026-01-14T12:00:00Z'),
    )
    // from 23:01:00, next */6 rolls to next day 00:00:00
    expect(nextCronRun('0 */6 * * *', new Date('2026-01-14T23:01:00Z'))).toEqual(
      new Date('2026-01-15T00:00:00Z'),
    )
  })

  it('computes next fire for daily pattern', () => {
    // from 7:00 UTC, daily 8am fires today
    expect(nextCronRun('0 8 * * *', new Date('2026-01-14T07:00:00Z'))).toEqual(
      new Date('2026-01-14T08:00:00Z'),
    )
    // from 9:00 UTC, daily 8am fires tomorrow
    expect(nextCronRun('0 8 * * *', new Date('2026-01-14T09:00:00Z'))).toEqual(
      new Date('2026-01-15T08:00:00Z'),
    )
    // from exactly 8:00:00, next is tomorrow (strictly after)
    expect(nextCronRun('0 8 * * *', new Date('2026-01-14T08:00:00Z'))).toEqual(
      new Date('2026-01-15T08:00:00Z'),
    )
  })

  it('computes next fire for specific day-of-week pattern', () => {
    // REF is Wednesday. Next Monday (dow=1) at 9am is 2026-01-19
    expect(nextCronRun('0 9 * * 1', REF)).toEqual(new Date('2026-01-19T09:00:00Z'))
    // REF is Wednesday. Next Thursday (dow=4) at 9am is 2026-01-15
    expect(nextCronRun('0 9 * * 4', REF)).toEqual(new Date('2026-01-15T09:00:00Z'))
  })

  it('computes next fire for weekdays pattern', () => {
    // REF is Wednesday 14:23. Weekday 9am: already passed today, next is Thursday
    expect(nextCronRun('0 9 * * 1-5', REF)).toEqual(new Date('2026-01-15T09:00:00Z'))
    // Friday 10:00, weekdays 9am: next is Monday
    expect(nextCronRun('0 9 * * 1-5', new Date('2026-01-16T10:00:00Z'))).toEqual(
      new Date('2026-01-19T09:00:00Z'),
    )
  })

  it('computes next fire for comma-separated day-of-week list', () => {
    // REF is Wednesday 2026-01-14 14:23. Next of {Mon, Wed, Fri} 9am strictly after now is Friday
    expect(nextCronRun('0 9 * * 1,3,5', REF)).toEqual(new Date('2026-01-16T09:00:00Z'))
    // From Sunday 2026-01-18 08:00, next of {Mon, Wed, Fri} 9am is Monday 2026-01-19
    expect(nextCronRun('0 9 * * 1,3,5', new Date('2026-01-18T08:00:00Z'))).toEqual(
      new Date('2026-01-19T09:00:00Z'),
    )
  })

  it('returns null for invalid day-of-week lists', () => {
    expect(nextCronRun('0 9 * * 1,8', REF)).toBeNull()
    expect(nextCronRun('0 9 * * 1,', REF)).toBeNull()
  })

  it('handles */N hours cross-midnight rollover correctly when target hour >= 24', () => {
    // */5 fires at 0,5,10,15,20. From 22:30 next is midnight next day, NOT 01:00 (JS Date wrap artifact)
    expect(nextCronRun('0 */5 * * *', new Date('2026-01-14T22:30:00Z'))).toEqual(
      new Date('2026-01-15T00:00:00Z'),
    )
    // */7 fires at 0,7,14,21. From 22:00 next is midnight next day
    expect(nextCronRun('0 */7 * * *', new Date('2026-01-14T22:00:00Z'))).toEqual(
      new Date('2026-01-15T00:00:00Z'),
    )
  })

  it('handles DOW=7 as a Sunday alias (GitHub Actions convention)', () => {
    // REF is Wednesday 2026-01-14; next Sunday is 2026-01-18
    expect(nextCronRun('0 9 * * 7', REF)).toEqual(new Date('2026-01-18T09:00:00Z'))
  })
})

describe('nextCronRuns', () => {
  const FROM = new Date('2026-06-06T06:00:00Z')

  it('returns count consecutive dates for a valid daily expression', () => {
    const runs = nextCronRuns('0 8 * * *', 3, FROM)
    expect(runs).toHaveLength(3)
    expect(runs[0]).toEqual(new Date('2026-06-06T08:00:00Z'))
    expect(runs[1]).toEqual(new Date('2026-06-07T08:00:00Z'))
    expect(runs[2]).toEqual(new Date('2026-06-08T08:00:00Z'))
    expect(runs.every((d) => d.getUTCHours() === 8 && d.getUTCMinutes() === 0)).toBe(true)
  })

  it('returns empty array for an invalid expression', () => {
    expect(nextCronRuns('99 99 * * *', 3, FROM)).toEqual([])
  })

  it('returns fewer than count when expression runs out', () => {
    expect(nextCronRuns('0 9 1 * *', 3, FROM)).toEqual([])
  })
})

describe('isValidCron', () => {
  it('returns true for valid expressions', () => {
    expect(isValidCron('0 8 * * *')).toBe(true)
    expect(isValidCron('*/15 * * * *')).toBe(true)
    expect(isValidCron('0 */6 * * *')).toBe(true)
    expect(isValidCron('0 9 * * 1-5')).toBe(true)
    expect(isValidCron('0 9 * * 1')).toBe(true)
  })

  it('returns true for dom/month-specific GitHub Actions expressions', () => {
    expect(isValidCron('0 8 1 * *')).toBe(true)
    expect(isValidCron('0 0 15 * *')).toBe(true)
    expect(isValidCron('0 9 * 6 *')).toBe(true)
    expect(isValidCron('0 9 1 6 *')).toBe(true)
  })

  it('returns false for invalid expressions', () => {
    expect(isValidCron('99 99 * * *')).toBe(false)
    expect(isValidCron('not a cron')).toBe(false)
    expect(isValidCron('0 9 32 * *')).toBe(false)
    expect(isValidCron('0 9 * 13 *')).toBe(false)
  })

  it('returns false for comma-separated hour/minute lists (not supported by the preview/description logic)', () => {
    expect(isValidCron('0 9,17 * * *')).toBe(false)
    expect(isValidCron('0,30 9 * * *')).toBe(false)
  })

  it('returns false for */n step where n exceeds the field maximum', () => {
    expect(isValidCron('*/100 * * * *')).toBe(false)
    expect(isValidCron('* */25 * * *')).toBe(false)
  })

  it('returns true for comma-separated day-of-week lists', () => {
    expect(isValidCron('0 9 * * 1,3,5')).toBe(true)
    expect(isValidCron('0 9 * * 0,6')).toBe(true)
  })

  it('returns false for invalid day-of-week lists', () => {
    expect(isValidCron('0 9 * * 1,8')).toBe(false)
    expect(isValidCron('0 9 * * 1,')).toBe(false)
  })
})

describe('formatRelativeTime', () => {
  const FROM = new Date('2026-01-14T14:00:00Z')

  it('formats minutes', () => {
    expect(formatRelativeTime(new Date('2026-01-14T14:01:00Z'), FROM)).toBe('in 1 minute')
    expect(formatRelativeTime(new Date('2026-01-14T14:30:00Z'), FROM)).toBe('in 30 minutes')
  })

  it('formats hours', () => {
    expect(formatRelativeTime(new Date('2026-01-14T15:00:00Z'), FROM)).toBe('in 1 hour')
    expect(formatRelativeTime(new Date('2026-01-14T16:00:00Z'), FROM)).toBe('in 2 hours')
  })

  it('formats days', () => {
    expect(formatRelativeTime(new Date('2026-01-15T14:00:00Z'), FROM)).toBe('in 1 day')
    expect(formatRelativeTime(new Date('2026-01-17T14:00:00Z'), FROM)).toBe('in 3 days')
  })
})
