export interface ParsedCard { question: string; answer: string; image_url?: string }
export function parseCards(raw: string): ParsedCard[] {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim() && !l.trimStart().startsWith('#'))
  if (!lines.length) return []
  const d = lines[0].includes('\t') ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = [], cur = '', q = false
  const text = lines.join('\n')
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += ch }
    else if (ch === '"') q = true
    else if (ch === d) { row.push(cur); cur = '' }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
    else cur += ch
  }
  row.push(cur); rows.push(row)
  return rows.filter(r => r.length >= 2 && r[0].trim() && r[1].trim()).map(r => ({
    question: r[0].trim(), answer: r[1].trim(), ...(r[2]?.trim() ? { image_url: r[2].trim() } : {}) }))
}
export const csvSafe = (s: string) => `"${(/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`
