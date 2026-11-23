export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
export function streak(dates: string[], now = new Date()): number {
  const days = new Set(dates.map(d => dayKey(new Date(d))))
  const c = new Date(now); let n = 0
  if (!days.has(dayKey(c))) c.setDate(c.getDate() - 1)
  while (days.has(dayKey(c))) { n++; c.setDate(c.getDate() - 1) }
  return n
}
export const reviewedToday = (dates: string[], now = new Date()) => dates.filter(d => dayKey(new Date(d)) === dayKey(now)).length
export const successRate = (r: { difficulty: string }[]) => r.length ? Math.round(r.filter(x => x.difficulty !== 'hard').length / r.length * 100) : 0
