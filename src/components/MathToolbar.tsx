export type Insert = (pre: string, post: string, placeholder: string, math: boolean) => void
const SYMBOLS: [string, string][] = [['α', '\\alpha'], ['β', '\\beta'], ['γ', '\\gamma'], ['δ', '\\delta'], ['θ', '\\theta'], ['λ', '\\lambda'], ['μ', '\\mu'], ['π', '\\pi'], ['σ', '\\sigma'], ['φ', '\\phi'], ['ω', '\\omega'], ['Δ', '\\Delta'], ['Σ', '\\Sigma'], ['Ω', '\\Omega'],
  ['±', '\\pm'], ['×', '\\times'], ['÷', '\\div'], ['≤', '\\le'], ['≥', '\\ge'], ['≠', '\\ne'], ['≈', '\\approx'], ['∞', '\\infty'], ['→', '\\to'], ['⇒', '\\Rightarrow'], ['∈', '\\in'], ['∂', '\\partial'], ['∇', '\\nabla'], ['°', '^\\circ']]
const STRUCTS: [string, string, string, string, string][] = [['x²', 'Superscript', '^{', '}', '2'], ['xₙ', 'Subscript', '_{', '}', 'n'], ['a⁄b', 'Fraction', '\\frac{', '}{b}', 'a'], ['√', 'Square root', '\\sqrt{', '}', 'x'],
  ['∑', 'Sum', '\\sum_{i=1}^{n} ', '', 'x_i'], ['∫', 'Integral', '\\int_{a}^{b} ', '\\,dx', 'f(x)'], ['lim', 'Limit', '\\lim_{x \\to 0} ', '', 'f(x)'], ['( )', 'Brackets', '\\left(', '\\right)', 'x']]
const keep = (e: React.MouseEvent) => e.preventDefault() // keep textarea selection

export default function MathToolbar({ onInsert, target }: { onInsert: Insert; target: string }) {
  const B = ({ l, t, f }: { l: string; t: string; f: () => void }) => <button type="button" className="chip" aria-label={t} title={t} onMouseDown={keep} onClick={f}>{l}</button>
  return <div className="space-y-2" role="toolbar" aria-label="Formatting and math symbols">
    <div className="flex flex-wrap gap-1.5 items-center">
      <B l="B" t="Bold" f={() => onInsert('**', '**', 'bold', false)} /><B l="I" t="Italic" f={() => onInsert('*', '*', 'italic', false)} />
      <B l="$ x $" t="Inline LaTeX" f={() => onInsert('$', '$', 'x^2', false)} /><B l="$$" t="Display LaTeX" f={() => onInsert('$$', '$$', '\\int_a^b f(x)\\,dx', false)} />
      <B l="↵" t="Line break" f={() => onInsert('\n', '', '', false)} />
      <span className="text-xs text-white/50 ml-auto">Inserts into {target}</span></div>
    <div className="flex flex-wrap gap-1.5">{STRUCTS.map(([l, t, pre, post, ph]) => <B key={t} l={l} t={t} f={() => onInsert(pre, post, ph, true)} />)}</div>
    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-auto">{SYMBOLS.map(([l, tex]) => <B key={tex} l={l} t={tex} f={() => onInsert(tex + ' ', '', '', true)} />)}</div>
  </div>
}
