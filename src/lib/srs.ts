export type Rating = 'easy' | 'medium' | 'hard'
export interface Sched { interval: number; ease: number } // interval in days; 0 = new
const DAY = 864e5
export function schedule(c: Sched, r: Rating, now = new Date()) {
  const isNew = c.interval === 0
  let { interval, ease } = c
  if (r === 'easy') { ease = Math.min(3, ease + 0.15); interval = isNew ? 3 : interval * ease }
  else if (r === 'medium') interval = isNew ? 1 : interval * 1.2
  else { ease = Math.max(1.3, ease - 0.2); interval = isNew ? 0.25 : interval / 2 }
  return { interval, ease, next_review: new Date(now.getTime() + interval * DAY).toISOString() }
}
export const isDue = (nextReview: string, now = new Date()) => new Date(nextReview) <= now
