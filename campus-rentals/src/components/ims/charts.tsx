'use client'

/**
 * Lightweight in-house SVG charts for the IMS — zero dependencies (keeps the
 * bundle lean and the build robust). Brand palette: teal accent + muted slate.
 */
import React from 'react'

const ACCENT = '#54AAB1'
const SLATE = '#6F898B'
const CHARCOAL = '#54595F'
const PALETTE = [ACCENT, SLATE, CHARCOAL, '#8FC7CC', '#9aa6a8', '#b8d8db', '#3f7e84', '#cdd6d7']

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink-900/5">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-ink-400">{title}</h3>
      {children}
    </div>
  )
}

/** Cumulative value line chart over time. points: {date, value}[] (sorted asc). */
export function LineChart({ points, height = 200 }: { points: { date: string; value: number }[]; height?: number }) {
  if (points.length < 2) {
    return <p className="text-sm text-ink-400">Not enough data to chart yet.</p>
  }
  const w = 600
  const h = height
  const pad = { l: 56, r: 12, t: 12, b: 28 }
  const xs = points.map((p) => new Date(p.date).getTime())
  const ys = points.map((p) => p.value)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(0, ...ys)
  const maxY = Math.max(...ys, 1)
  const sx = (x: number) => pad.l + ((x - minX) / (maxX - minX || 1)) * (w - pad.l - pad.r)
  const sy = (y: number) => h - pad.b - ((y - minY) / (maxY - minY || 1)) * (h - pad.t - pad.b)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(xs[i])} ${sy(p.value)}`).join(' ')
  const area = `${path} L ${sx(maxX)} ${sy(minY)} L ${sx(minX)} ${sy(minY)} Z`
  const ticks = 4
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Value over time">
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const y = minY + ((maxY - minY) * i) / ticks
        return (
          <g key={i}>
            <line x1={pad.l} y1={sy(y)} x2={w - pad.r} y2={sy(y)} stroke="#EEF0F1" />
            <text x={pad.l - 8} y={sy(y) + 3} textAnchor="end" fontSize="9" fill="#8E979D">
              {usd(y)}
            </text>
          </g>
        )
      })}
      <path d={area} fill={ACCENT} opacity={0.12} />
      <path d={path} fill="none" stroke={ACCENT} strokeWidth={2} />
      <text x={pad.l} y={h - 8} fontSize="9" fill="#8E979D">
        {new Date(minX).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
      </text>
      <text x={w - pad.r} y={h - 8} textAnchor="end" fontSize="9" fill="#8E979D">
        {new Date(maxX).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
      </text>
    </svg>
  )
}

/** Donut allocation chart. slices: {label, value}[]. */
export function DonutChart({ slices, size = 200 }: { slices: { label: string; value: number }[]; size?: number }) {
  const total = slices.reduce((s, x) => s + Math.max(x.value, 0), 0)
  if (total <= 0) return <p className="text-sm text-ink-400">No allocation to show.</p>
  const r = size / 2
  const inner = r * 0.6
  let angle = -Math.PI / 2
  const arc = (frac: number) => {
    const a0 = angle
    const a1 = angle + frac * 2 * Math.PI
    angle = a1
    const large = a1 - a0 > Math.PI ? 1 : 0
    const x0 = r + r * Math.cos(a0)
    const y0 = r + r * Math.sin(a0)
    const x1 = r + r * Math.cos(a1)
    const y1 = r + r * Math.sin(a1)
    const xi1 = r + inner * Math.cos(a1)
    const yi1 = r + inner * Math.sin(a1)
    const xi0 = r + inner * Math.cos(a0)
    const yi0 = r + inner * Math.sin(a0)
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${inner} ${inner} 0 ${large} 0 ${xi0} ${yi0} Z`
  }
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Allocation by deal">
        {slices.map((s, i) => (
          <path key={i} d={arc(Math.max(s.value, 0) / total)} fill={PALETTE[i % PALETTE.length]} />
        ))}
      </svg>
      <ul className="space-y-1 text-sm">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            <span className="text-ink-700">{s.label}</span>
            <span className="text-ink-400">{((s.value / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Monthly bars (e.g. distributions calendar). bars: {label, value}[]. */
export function BarChart({ bars, height = 200 }: { bars: { label: string; value: number }[]; height?: number }) {
  if (bars.length === 0) return <p className="text-sm text-ink-400">No distributions recorded.</p>
  const w = 600
  const h = height
  const pad = { l: 56, r: 12, t: 12, b: 28 }
  const max = Math.max(...bars.map((b) => b.value), 1)
  const bw = (w - pad.l - pad.r) / bars.length
  const sy = (v: number) => h - pad.b - (v / max) * (h - pad.t - pad.b)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Distributions by month">
      {[0, 0.5, 1].map((f, i) => (
        <g key={i}>
          <line x1={pad.l} y1={sy(max * f)} x2={w - pad.r} y2={sy(max * f)} stroke="#EEF0F1" />
          <text x={pad.l - 8} y={sy(max * f) + 3} textAnchor="end" fontSize="9" fill="#8E979D">
            {usd(max * f)}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const x = pad.l + i * bw + bw * 0.15
        const bwidth = bw * 0.7
        return (
          <g key={i}>
            <rect x={x} y={sy(b.value)} width={bwidth} height={Math.max(h - pad.b - sy(b.value), 0)} rx={2} fill={ACCENT} />
            {i % Math.ceil(bars.length / 8 || 1) === 0 && (
              <text x={x + bwidth / 2} y={h - 10} textAnchor="middle" fontSize="8" fill="#8E979D">
                {b.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Contributed → Distributed → Current-value bridge ("waterfall") for one investor.
 * steps: {label, value, kind: 'base'|'add'|'sub'|'total'}[].
 */
export function WaterfallChart({
  steps,
  height = 240,
}: {
  steps: { label: string; value: number; kind: 'base' | 'add' | 'sub' | 'total' }[]
  height?: number
}) {
  if (steps.length === 0) return <p className="text-sm text-ink-400">No data.</p>
  const w = 600
  const h = height
  const pad = { l: 56, r: 12, t: 12, b: 36 }
  // Compute running cumulative for floating bars.
  let running = 0
  const bars = steps.map((s) => {
    if (s.kind === 'base' || s.kind === 'total') {
      const bar = { start: 0, end: s.value, label: s.label, value: s.value }
      running = s.value
      return bar
    }
    const start = running
    const end = s.kind === 'add' ? running + s.value : running - s.value
    running = end
    return { start, end, label: s.label, value: s.value }
  })
  const max = Math.max(...bars.map((b) => Math.max(b.start, b.end)), 1)
  const bw = (w - pad.l - pad.r) / bars.length
  const sy = (v: number) => h - pad.b - (v / max) * (h - pad.t - pad.b)
  const color = (k: string) => (k === 'add' ? ACCENT : k === 'sub' ? '#cdd6d7' : SLATE)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Capital bridge">
      {[0, 0.5, 1].map((f, i) => (
        <line key={i} x1={pad.l} y1={sy(max * f)} x2={w - pad.r} y2={sy(max * f)} stroke="#EEF0F1" />
      ))}
      {bars.map((b, i) => {
        const x = pad.l + i * bw + bw * 0.15
        const bwidth = bw * 0.7
        const top = Math.min(sy(b.start), sy(b.end))
        const barH = Math.abs(sy(b.start) - sy(b.end)) || 2
        return (
          <g key={i}>
            <rect x={x} y={top} width={bwidth} height={barH} rx={2} fill={color(steps[i].kind)} />
            <text x={x + bwidth / 2} y={h - 20} textAnchor="middle" fontSize="8" fill="#6B747A">
              {b.label}
            </text>
            <text x={x + bwidth / 2} y={h - 8} textAnchor="middle" fontSize="8" fill="#8E979D">
              {usd(b.value)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
