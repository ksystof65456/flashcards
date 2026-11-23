import katex from 'katex'
import DOMPurify from 'dompurify'
const MATH = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(\\begin\{aligned\}[\s\S]+?\\end\{aligned\})|\$([^$\n]+?)\$/g
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const text = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>')
const math = (tex: string, display: boolean) =>
  katex.renderToString(tex, { displayMode: display, throwOnError: false, trust: false, output: 'htmlAndMathml' })
export function renderRich(src: string): string {
  let out = '', last = 0
  for (const m of src.matchAll(MATH)) {
    out += text(src.slice(last, m.index))
    const [full, a, b, c, d, e] = m
    out += a !== undefined ? math(a, true) : b !== undefined ? math(b, true) : d !== undefined ? math(d, true) : math(c ?? e ?? full, false)
    last = (m.index ?? 0) + full.length
  }
  out += text(src.slice(last))
  return DOMPurify.sanitize(out, { USE_PROFILES: { html: true, mathMl: true, svg: true } })
}
