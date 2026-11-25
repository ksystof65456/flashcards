import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { schedule, isDue, type Rating } from './lib/srs'
import { renderRich } from './lib/latex'
import { parseCards, readText, csvSafe, type ParsedCard } from './lib/csv'
import { streak, reviewedToday, successRate, dayKey } from './lib/stats'
import { loadSettings, saveSettings, permission, shouldNotify, buildMessage, notify } from './lib/notify'
import MathToolbar from './components/MathToolbar'
import NotificationSettings from './components/NotificationSettings'

interface Deck { id: string; name: string; color: string }
interface Card { id: string; deck_id: string | null; question: string; answer: string; image_url: string | null; image_side: 'front' | 'back'; next_review: string; interval: number; ease: number }
interface Log { difficulty: Rating; created_at: string }
const Rich = ({ s }: { s: string }) => <div dangerouslySetInnerHTML={{ __html: renderRich(s) }} />
const ok = <T,>(r: { data: T | null; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data as T }

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() // search ignores diacritics

function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in'), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('')
    const { error } = mode === 'in' ? await supabase.auth.signInWithPassword({ email, password: pw }) : await supabase.auth.signUp({ email, password: pw })
    setMsg(error ? error.message : mode === 'up' ? 'Check your email to confirm your account.' : '')
  }
  return <main className="min-h-dvh grid place-items-center p-6"><form onSubmit={e => void submit(e)} className="glass fade w-full max-w-sm p-8 space-y-4">
    <h1 className="text-3xl font-bold">Flashcards</h1><p className="text-white/60">{mode === 'in' ? 'Welcome back' : 'Create your account'}</p>
    <input className="inp" type="email" required aria-label="Email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
    <input className="inp" type="password" required minLength={6} aria-label="Password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} />
    {msg && <p role="alert" className="text-sm text-amber-300">{msg}</p>}
    <button className="btn btn-p w-full">{mode === 'in' ? 'Sign in' : 'Sign up'}</button>
    <button type="button" className="text-sm text-white/70 underline" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}</button>
  </form></main>
}

function Editor({ card, decks, deckId, onClose, onSaved }: { card: Card | null; decks: Deck[]; deckId: string; onClose: () => void; onSaved: () => void }) {
  const [q, setQ] = useState(card?.question ?? ''), [a, setA] = useState(card?.answer ?? ''), [img, setImg] = useState(card?.image_url ?? '')
  const [side, setSide] = useState(card?.image_side ?? 'front'), [d, setD] = useState(card?.deck_id ?? (deckId === 'all' ? '' : deckId)), [err, setErr] = useState('')
  const qRef = useRef<HTMLTextAreaElement>(null), aRef = useRef<HTMLTextAreaElement>(null), [field, setField] = useState<'q' | 'a'>('q')
  const ins = (pre: string, post: string, ph: string, isMath: boolean) => {
    const el = (field === 'q' ? qRef : aRef).current; if (!el) return
    const v = el.value, s = el.selectionStart, e = el.selectionEnd, before = v.slice(0, s)
    const inMath = (before.match(/\$\$/g) ?? []).length % 2 === 1 || (before.replace(/\$\$/g, '').match(/\$/g) ?? []).length % 2 === 1
    const wrap = isMath && !inMath ? '$' : '', mid = v.slice(s, e) || ph, start = s + wrap.length + pre.length
    ;(field === 'q' ? setQ : setA)(before + wrap + pre + mid + post + wrap + v.slice(e))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start, start + mid.length) })
  }
  const valid = (q.trim() && a.trim()) || (img.trim() && (q.trim() || a.trim()))
  const save = async () => {
    if (!valid) return
    const row = { question: q.trim(), answer: a.trim(), image_url: img.trim() || null, image_side: side, deck_id: d || null }
    try { ok(card ? await supabase.from('cards').update(row).eq('id', card.id) : await supabase.from('cards').insert(row)); onSaved(); onClose() }
    catch (e) { setErr((e as Error).message) }
  }
  const file = (f?: File) => { if (!f) return; const r = new FileReader(); r.onload = () => setImg(String(r.result)); r.readAsDataURL(f) }
  return <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Card editor"
    onKeyDown={e => { if (e.key === 'Escape') onClose(); if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void save() }}>
    <div className="glass fade w-full sm:max-w-lg max-h-[92dvh] overflow-auto p-6 space-y-3 rounded-b-none sm:rounded-b-3xl">
      <h2 className="text-xl font-semibold">{card ? 'Edit card' : 'New card'}</h2>
      <select className="inp" aria-label="Deck" value={d} onChange={e => setD(e.target.value)}><option value="">No deck</option>{decks.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <MathToolbar onInsert={ins} target={field === 'q' ? 'question' : 'answer'} />
      <textarea ref={qRef} onFocus={() => setField('q')} className="inp font-mono" aria-label="Question" placeholder="Question" rows={3} value={q} onChange={e => setQ(e.target.value)} autoFocus />
      <textarea ref={aRef} onFocus={() => setField('a')} className="inp font-mono" aria-label="Answer" placeholder="Answer" rows={3} value={a} onChange={e => setA(e.target.value)} />
      <p className="text-xs text-white/50">LaTeX: $x^2$ inline · $$\int_a^b f(x)\,dx$$ display · **bold** · *italic*</p>
      <div className="glass p-3 text-sm"><Rich s={q || 'Preview'} /><hr className="my-2 border-white/10" /><Rich s={a || ''} /></div>
      <input className="inp" aria-label="Image URL" placeholder="Image URL" value={img.startsWith('data:') ? '' : img} onChange={e => setImg(e.target.value)} />
      <input type="file" accept="image/*" aria-label="Upload image" onChange={e => file(e.target.files?.[0])} />
      {img && <><img src={img} alt="Preview" className="max-h-32 rounded-xl" /><select className="inp" aria-label="Image side" value={side} onChange={e => setSide(e.target.value as 'front' | 'back')}><option value="front">Image on front</option><option value="back">Image on back</option></select></>}
      {err && <p role="alert" className="text-red-400 text-sm">{err}</p>}
      <div className="flex gap-2 justify-end"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-p disabled:opacity-40" disabled={!valid} onClick={() => void save()}>Save</button></div>
    </div></div>
}

function Main({ session }: { session: Session }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'review' | 'cards' | 'stats'>('review'), [deckId, setDeckId] = useState('all'), [flipped, setFlipped] = useState(false)
  const [edit, setEdit] = useState<Card | null | 'new'>(null), [search, setSearch] = useState(''), [preview, setPreview] = useState<ParsedCard[] | null>(null), [busy, setBusy] = useState(false)
  const data = useQuery({ queryKey: ['data', session.user.id], queryFn: async () => {
    const [decks, cards, logs] = await Promise.all([supabase.from('decks').select('*').order('created_at'), supabase.from('cards').select('*').order('next_review'), supabase.from('review_logs').select('difficulty,created_at')])
    return { decks: ok(decks) as Deck[], cards: ok(cards) as Card[], logs: ok(logs) as Log[] } } })
  const refresh = () => qc.invalidateQueries({ queryKey: ['data'] })
  const [ns, setNs] = useState(loadSettings), [nOpen, setNOpen] = useState(false)
  const updateNs = (n: typeof ns) => { setNs(n); saveSettings(n) }
  useEffect(() => {
    const check = () => {
      if (!data.data) return
      const dueN = data.data.cards.filter(c => isDue(c.next_review)).length, done = reviewedToday(data.data.logs.map(l => l.created_at))
      if (shouldNotify(ns, dueN, done, permission())) { void notify(buildMessage(dueN, ns.goal, done)); updateNs({ ...ns, lastNotified: dayKey(new Date()) }) }
    }
    check(); const id = setInterval(check, 60000); document.addEventListener('visibilitychange', check)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', check) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.data, ns])
  if (data.isLoading) return <p className="p-8 text-center" role="status">Loading…</p>
  if (data.error || !data.data) return <p className="p-8 text-center text-red-400" role="alert">{(data.error as Error)?.message ?? 'Failed to load'} <button className="btn ml-2" onClick={() => void data.refetch()}>Retry</button></p>
  const { decks, cards, logs } = data.data
  const filtered = cards.filter(c => deckId === 'all' || c.deck_id === deckId)
  const due = filtered.filter(c => isDue(c.next_review)), current = due[0]
  const dates = logs.map(l => l.created_at), week = logs.filter(l => Date.now() - +new Date(l.created_at) < 7 * 864e5)
  const rate = (r: Rating) => {
    if (!current) return
    setFlipped(false)
    setTimeout(() => { void (async () => { try { ok(await supabase.from('cards').update(schedule(current, r)).eq('id', current.id)); ok(await supabase.from('review_logs').insert({ card_id: current.id, difficulty: r })); await refresh() } catch (e) { alert((e as Error).message) } })() }, 350)
  }
  const del = async (c: Card) => { if (confirm('Delete this card and its review history?')) { ok(await supabase.from('cards').delete().eq('id', c.id)); await refresh() } }
  const addDeck = async () => { const name = prompt('Deck name'); if (name?.trim()) { ok(await supabase.from('decks').insert({ name: name.trim(), color: `hsl(${(decks.length * 137) % 360} 70% 55%)` })); await refresh() } }
  const rmDeck = async () => { const d = decks.find(x => x.id === deckId); if (d && confirm(`Delete deck "${d.name}"? Its cards will be kept.`)) { ok(await supabase.from('decks').delete().eq('id', d.id)); setDeckId('all'); await refresh() } }
  const onFile = async (f?: File) => { if (f) setPreview(parseCards(await readText(f))) }
  const doImport = async () => { if (!preview) return; setBusy(true); try { ok(await supabase.from('cards').insert(preview.map(p => ({ ...p, deck_id: deckId === 'all' ? null : deckId })))); setPreview(null); await refresh() } catch (e) { alert((e as Error).message) } setBusy(false) }
  const exportCsv = () => { const b = new Blob(['\uFEFF' + ['question,answer,image', ...filtered.map(c => [c.question, c.answer, c.image_url ?? ''].map(csvSafe).join(','))].join('\n')], { type: 'text/csv;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'flashcards.csv'; a.click() }
  const shown = filtered.filter(c => fold(c.question + c.answer).includes(fold(search)))
  const Img = ({ c, side }: { c: Card; side: string }) => c.image_url && c.image_side === side ? <img src={c.image_url} alt="" className="max-h-40 rounded-xl mb-3" /> : null
  return <div className="mx-auto max-w-xl min-h-dvh flex flex-col p-4 pb-24">
    <header className="flex items-center justify-between py-2"><h1 className="text-2xl font-bold truncate">{decks.find(d => d.id === deckId)?.name ?? 'Flashcards'}</h1>
      <div className="flex gap-2"><button className="btn" aria-label="Notification settings" onClick={() => setNOpen(true)}>🔔</button><button className="btn" aria-label="Create card" onClick={() => setEdit('new')}>＋</button>
        <label className="btn cursor-pointer" aria-label="Import CSV">⤓<input type="file" hidden accept=".csv,.tsv,.txt" onChange={e => void onFile(e.target.files?.[0])} /></label>
        <button className="btn" aria-label="Export CSV" onClick={exportCsv}>⤒</button><button className="btn" aria-label="Sign out" onClick={() => void supabase.auth.signOut()}>⏻</button></div></header>
    <div className="flex gap-2 items-center my-2"><select className="inp" aria-label="Deck filter" value={deckId} onChange={e => setDeckId(e.target.value)}><option value="all">All Cards</option>{decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      <button className="btn" onClick={() => void addDeck()}>New deck</button>{deckId !== 'all' && <button className="btn" onClick={() => void rmDeck()}>Delete</button>}</div>
    <p className="text-sm text-white/60 mb-3">{due.length} due · {filtered.length} cards</p>
    {tab === 'review' && (current ? <div className="fade flex-1 flex flex-col items-center gap-4"><div className="scene w-full max-w-sm aspect-[3/4]"><button aria-label="Flip card" className={`flip w-full h-full ${flipped ? 'on' : ''}`} onClick={() => setFlipped(!flipped)}>
      <div className="face glass flex-col"><Img c={current} side="front" /><Rich s={current.question} /></div><div className="face back glass flex-col"><Img c={current} side="back" /><Rich s={current.answer} /></div></button></div>
      {flipped && <div className="fade flex gap-2">{(['hard', 'medium', 'easy'] as Rating[]).map(r => <button key={r} className="btn" style={{ background: r === 'easy' ? '#16a34a' : r === 'medium' ? '#d97706' : '#dc2626' }} onClick={() => rate(r)}>{r[0].toUpperCase() + r.slice(1)}</button>)}</div>}</div>
      : <div className="glass fade p-10 text-center m-auto"><p className="text-4xl mb-2">✓</p><h2 className="text-xl font-semibold">All caught up</h2><p className="text-white/60">No cards are due.</p></div>)}
    {tab === 'cards' && <div className="space-y-2 fade"><input className="inp" aria-label="Search" placeholder="Search cards" value={search} onChange={e => setSearch(e.target.value)} />
      {shown.length === 0 ? <div className="glass p-8 text-center"><p className="mb-3">No cards yet.</p><button className="btn btn-p" onClick={() => setEdit('new')}>Create a card</button></div> :
        shown.map(c => <div key={c.id} className="glass p-4 flex gap-3 items-start"><div className="flex-1 min-w-0 text-sm"><Rich s={c.question} /><p className="text-xs text-white/50 mt-1">{c.image_url ? '🖼 ' : ''}{isDue(c.next_review) ? 'Due now' : new Date(c.next_review).toLocaleDateString()}</p></div>
          <button className="btn" onClick={() => setEdit(c)}>Edit</button><button className="btn" aria-label="Delete card" onClick={() => void del(c)}>🗑</button></div>)}</div>}
    {tab === 'stats' && <div className="grid grid-cols-2 gap-3 fade">{([['Streak', streak(dates)], ['Today', reviewedToday(dates)], ['7-day success', successRate(week) + '%'], ['Total reviews', logs.length], ['Library', cards.length]] as [string, string | number][]).map(([k, v]) => <div key={k} className="glass p-4"><p className="text-3xl font-bold" style={{ color: 'var(--p)' }}>{v}</p><p className="text-sm text-white/60">{k}</p></div>)}
      {!logs.length && <p className="col-span-2 text-center text-white/60">Review a card to start your stats.</p>}</div>}
    <nav className="glass fixed bottom-3 left-1/2 -translate-x-1/2 flex gap-1 p-1" aria-label="Main">{(['review', 'cards', 'stats'] as const).map(t => <button key={t} aria-current={tab === t} className={`btn capitalize ${tab === t ? 'btn-p' : ''}`} onClick={() => setTab(t)}>{t}</button>)}</nav>
    {nOpen && <NotificationSettings settings={ns} due={due.length} onChange={updateNs} onClose={() => setNOpen(false)} />}
    {edit && <Editor key={edit === 'new' ? 'new' : edit.id} card={edit === 'new' ? null : edit} decks={decks} deckId={deckId} onClose={() => setEdit(null)} onSaved={() => void refresh()} />}
    {preview && <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4" role="dialog" aria-label="Import preview"><div className="glass fade p-6 w-full max-w-md space-y-3"><h2 className="font-semibold">{preview.length} cards found</h2>
      {preview.slice(0, 3).map((p, i) => <div key={i} className="text-sm glass p-2"><Rich s={p.question} /></div>)}{!preview.length && <p className="text-amber-300">No valid rows found.</p>}
      <div className="flex gap-2 justify-end"><button className="btn" onClick={() => setPreview(null)}>Cancel</button><button className="btn btn-p" disabled={!preview.length || busy} onClick={() => void doImport()}>Import</button></div></div></div>}
  </div>
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null), [ready, setReady] = useState(false)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!ready) return <p className="p-8 text-center" role="status">Loading…</p>
  return session ? <Main session={session} /> : <Auth />
}
