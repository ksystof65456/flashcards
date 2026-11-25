import { describe, expect, it } from 'vitest'
import { buildMessage, shouldNotify, defaults } from './notify'
const on = { ...defaults, enabled: true }
const now = new Date('2026-11-23T10:00:00')
describe('notify', () => {
  it('notifies once per day when cards are due', () => {
    expect(shouldNotify(on, 5, 0, 'granted', now)).toBe(true)
    expect(shouldNotify({ ...on, lastNotified: '2026-10-23' }, 5, 0, 'granted', now)).toBe(false) // already sent today (month is 0-based)
  })
  it('skips when disabled, denied, nothing due, or goal reached', () => {
    expect(shouldNotify(defaults, 5, 0, 'granted', now)).toBe(false)
    expect(shouldNotify(on, 5, 0, 'denied', now)).toBe(false)
    expect(shouldNotify(on, 0, 0, 'granted', now)).toBe(false)
    expect(shouldNotify(on, 5, 20, 'granted', now)).toBe(false)
    expect(shouldNotify({ ...on, goal: 0 }, 5, 99, 'granted', now)).toBe(true)
  })
  it('builds the daily message', () => {
    expect(buildMessage(3, 10, 4)).toBe('3 cards due. Daily goal: 10 — 6 to go today.')
    expect(buildMessage(1, 0, 0)).toContain('1 card due')
  })
})
