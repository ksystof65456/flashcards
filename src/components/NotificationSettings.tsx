import { useState } from 'react'
import { permission, requestPermission, notify, buildMessage, type NotifSettings, type Perm } from '../lib/notify'

export default function NotificationSettings({ settings, due, onChange, onClose }: { settings: NotifSettings; due: number; onChange: (s: NotifSettings) => void; onClose: () => void }) {
  const [perm, setPerm] = useState<Perm>(permission()), [msg, setMsg] = useState('')
  const toggle = async (on: boolean) => {
    setMsg('')
    if (!on) return onChange({ ...settings, enabled: false })
    const p = await requestPermission(); setPerm(p)
    if (p === 'granted') onChange({ ...settings, enabled: true, lastNotified: '' })
    else setMsg(p === 'denied' ? 'Notifications are blocked. Allow them in your browser’s site settings, then try again.' : p === 'unsupported' ? 'This browser does not support notifications.' : 'Permission was dismissed. Try again when ready.')
  }
  return <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Notification settings" onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
    <div className="glass fade w-full sm:max-w-md p-6 space-y-4 rounded-b-none sm:rounded-b-3xl">
      <h2 className="text-xl font-semibold">Reminders</h2>
      <label className="flex items-center justify-between gap-3"><span>Daily reminder</span>
        <input type="checkbox" className="size-5 accent-[hsl(174_72%_50%)]" checked={settings.enabled && perm === 'granted'} disabled={perm === 'unsupported'} onChange={e => void toggle(e.target.checked)} /></label>
      {perm === 'denied' && <p role="alert" className="text-sm text-amber-300">Notifications are blocked for this site. Enable them in your browser settings.</p>}
      {perm === 'unsupported' && <p role="alert" className="text-sm text-amber-300">Notifications aren’t supported here. On iPhone, install the app to your Home Screen first.</p>}
      {msg && <p role="alert" className="text-sm text-amber-300">{msg}</p>}
      <label className="block space-y-1"><span className="text-sm text-white/70">Daily card goal (0 = unlimited)</span>
        <input className="inp" type="number" min={0} max={9999} value={settings.goal} onChange={e => onChange({ ...settings, goal: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} /></label>
      <p className="text-xs text-white/50">One reminder per day when cards are due. Reminders appear while the app is open or running in the background — they are not sent when it is fully closed.</p>
      <div className="flex gap-2 justify-end"><button className="btn" disabled={perm !== 'granted'} onClick={() => void notify(buildMessage(due, settings.goal, 0))}>Send test</button><button className="btn btn-p" autoFocus onClick={onClose}>Done</button></div>
    </div></div>
}
