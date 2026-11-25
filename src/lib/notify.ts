import { dayKey } from './stats'
export interface NotifSettings { enabled: boolean; goal: number; lastNotified: string }
export type Perm = 'granted' | 'denied' | 'default' | 'unsupported'
const KEY = 'flashcards.notifications'
export const defaults: NotifSettings = { enabled: false, goal: 20, lastNotified: '' }
export function loadSettings(): NotifSettings {
  try { return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<NotifSettings> | null) } } catch { return defaults }
}
export function saveSettings(s: NotifSettings) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage unavailable */ } }
export const permission = (): Perm => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
export async function requestPermission(): Promise<Perm> {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.requestPermission()
}
export function shouldNotify(s: NotifSettings, due: number, reviewedToday: number, perm: Perm, now = new Date()) {
  return s.enabled && perm === 'granted' && due > 0 && s.lastNotified !== dayKey(now) && !(s.goal > 0 && reviewedToday >= s.goal)
}
export function buildMessage(due: number, goal: number, reviewed: number) {
  const cards = `${due} card${due === 1 ? '' : 's'} due`
  if (goal <= 0) return `${cards}. Time for a quick review!`
  return `${cards}. Daily goal: ${goal} — ${Math.max(0, goal - reviewed)} to go today.`
}
export async function notify(body: string) {
  const opts = { body, icon: `${import.meta.env.BASE_URL}icon-192.png`, tag: 'flashcards-daily' }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification('Flashcards', opts)
    else new Notification('Flashcards', opts)
  } catch { /* notification failed; ignore */ }
}
