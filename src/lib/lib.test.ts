import { describe, expect, it } from 'vitest'
import { schedule } from './srs'
import { parseCards } from './csv'
import { renderRich } from './latex'
import { streak, reviewedToday } from './stats'
describe('srs', () => {
  it('new easy → 3 days, ease +0.15', () => { const r = schedule({ interval: 0, ease: 2.5 }, 'easy'); expect(r.interval).toBe(3); expect(r.ease).toBeCloseTo(2.65) })
  it('hard clamps ease', () => expect(schedule({ interval: 2, ease: 1.4 }, 'hard').ease).toBe(1.3))
  it('medium multiplies by 1.2', () => expect(schedule({ interval: 5, ease: 2.5 }, 'medium').interval).toBeCloseTo(6))
})
describe('csv', () => {
  it('parses quotes, tabs, comments, image', () => {
    expect(parseCards('# c\n"a, b","say ""hi""",http://x/i.png')).toEqual([{ question: 'a, b', answer: 'say "hi"', image_url: 'http://x/i.png' }])
    expect(parseCards('q\ta')).toHaveLength(1)
  })
})
describe('latex', () => {
  it('renders math and strips scripts', () => {
    expect(renderRich('$x^2$')).toContain('katex')
    expect(renderRich('<script>alert(1)</script>')).not.toContain('<script')
  })
})
describe('stats', () => {
  const now = new Date('2026-11-23T12:00:00'); const d = (s: string) => new Date(s).toISOString()
  it('streak counts consecutive days', () => expect(streak([d('2026-11-23T09:00:00'), d('2026-11-22T09:00:00'), d('2026-11-20T09:00:00')], now)).toBe(2))
  it('counts today', () => expect(reviewedToday([d('2026-11-23T09:00:00'), d('2026-11-22T09:00:00')], now)).toBe(1))
})
