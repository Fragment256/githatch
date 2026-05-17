import { describe, it, expect } from 'vitest'
import { describeCron } from './cronLabel'

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
})
