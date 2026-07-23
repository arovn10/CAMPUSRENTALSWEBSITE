'use client'

/**
 * Interactive floor plans for Campus Rentals Plaza.
 * Redrawn (simplified + approximate) from the approved permit set — not construction documents.
 * Layers: room labels (default on), dimensions (toggle), draggable example furniture (toggle).
 */

import { useMemo, useRef, useState } from 'react'
import { trackEvent } from '@/utils/analytics'

type Room = { id: string; name: string; sqft?: number; x: number; y: number; w: number; h: number; outdoor?: boolean }
type Dim = { x1: number; y1: number; x2: number; y2: number; label: string }
type FurnKind = 'bed' | 'sofa' | 'table' | 'island' | 'chair' | 'round'
type Furn = { id: string; kind: FurnKind; label: string; x: number; y: number; w: number; h: number; rot?: number }
type Plan = {
  id: string
  name: string
  facts: string
  w: number
  h: number
  rooms: Room[]
  dims: Dim[]
  furniture: Furn[]
}

const PLANS: Plan[] = [
  {
    id: 'penthouse',
    name: 'The Penthouse',
    facts: '4 bed · 4.5 bath · 1,960 sq ft · full top floor',
    w: 47,
    h: 42,
    rooms: [
      { id: 'terrace', name: 'Terrace', sqft: 96, x: 17.5, y: 0, w: 12, h: 8, outdoor: true },
      { id: 'bed2', name: 'Bedroom 2', sqft: 156, x: 0, y: 0, w: 13, h: 12 },
      { id: 'living', name: 'Living Room', sqft: 204, x: 13, y: 8, w: 17, h: 12 },
      { id: 'bed3', name: 'Bedroom 3', sqft: 168, x: 30, y: 0, w: 17, h: 12 },
      { id: 'pbath', name: 'Primary Bath', sqft: 90, x: 0, y: 12, w: 9, h: 10 },
      { id: 'wic', name: 'W.I.C.', sqft: 48, x: 0, y: 22, w: 9, h: 6 },
      { id: 'half', name: '½ Bath', sqft: 30, x: 9, y: 20, w: 4, h: 8 },
      { id: 'core', name: 'Stair · Elevator', x: 13, y: 20, w: 11, h: 8 },
      { id: 'kitchen', name: 'Kitchen', sqft: 150, x: 24, y: 20, w: 14, h: 8 },
      { id: 'bath3', name: 'Bath 3', sqft: 45, x: 38, y: 12, w: 9, h: 6 },
      { id: 'bath4', name: 'Bath 4', sqft: 45, x: 38, y: 18, w: 9, h: 5 },
      { id: 'laundry', name: 'Pantry · Laundry', sqft: 48, x: 30, y: 12, w: 8, h: 8 },
      { id: 'pbed', name: 'Primary Bedroom', sqft: 196, x: 0, y: 28, w: 14, h: 14 },
      { id: 'dining', name: 'Dining', sqft: 238, x: 14, y: 28, w: 17, h: 14 },
      { id: 'bed4', name: 'Bedroom 4', sqft: 224, x: 31, y: 28, w: 16, h: 14 },
    ],
    dims: [
      { x1: 0, y1: -4, x2: 47, y2: -4, label: "47'-0\"" },
      { x1: 51, y1: 0, x2: 51, y2: 42, label: "42'-0\"" },
      { x1: 17.5, y1: -1.5, x2: 29.5, y2: -1.5, label: "12'-0\" terrace" },
      { x1: -3.5, y1: 28, x2: -3.5, y2: 42, label: "14'-0\"" },
    ],
    furniture: [
      { id: 'ph-bed1', kind: 'bed', label: 'King', x: 3.5, y: 31, w: 6.5, h: 7 },
      { id: 'ph-bed2', kind: 'bed', label: 'Queen', x: 3, y: 2, w: 5, h: 6.5 },
      { id: 'ph-bed3', kind: 'bed', label: 'Queen', x: 36, y: 2, w: 5, h: 6.5 },
      { id: 'ph-bed4', kind: 'bed', label: 'Queen', x: 36.5, y: 31.5, w: 5, h: 6.5 },
      { id: 'ph-sofa', kind: 'sofa', label: 'Sofa', x: 15, y: 9.5, w: 8, h: 3 },
      { id: 'ph-coffee', kind: 'table', label: '', x: 17, y: 14, w: 4, h: 2 },
      { id: 'ph-dining', kind: 'table', label: 'Dining', x: 18.5, y: 32.5, w: 8, h: 4 },
      { id: 'ph-island', kind: 'island', label: 'Island', x: 27, y: 23.5, w: 8, h: 3 },
      { id: 'ph-lounge1', kind: 'round', label: 'Lounge', x: 19, y: 2, w: 3, h: 3 },
      { id: 'ph-lounge2', kind: 'round', label: 'Lounge', x: 24.5, y: 2, w: 3, h: 3 },
    ],
  },
  {
    id: 'flat',
    name: 'The Flat',
    facts: '2 bed · 2 bath · 937–992 sq ft',
    w: 44,
    h: 23,
    rooms: [
      { id: 'balcony', name: 'Balcony', sqft: 60, x: 16, y: -5, w: 12, h: 5, outdoor: true },
      { id: 'pbed', name: 'Primary Bedroom', sqft: 156, x: 0, y: 0, w: 13, h: 12 },
      { id: 'living', name: 'Living Room', sqft: 192, x: 13, y: 0, w: 16, h: 12 },
      { id: 'bed2', name: 'Bedroom 2', sqft: 180, x: 29, y: 0, w: 15, h: 12 },
      { id: 'pbath', name: 'Primary Bath', sqft: 48, x: 0, y: 12, w: 8, h: 6 },
      { id: 'wic', name: 'W.I.C.', sqft: 40, x: 0, y: 18, w: 8, h: 5 },
      { id: 'kitchen', name: 'Kitchen', sqft: 110, x: 8, y: 12, w: 13, h: 11 },
      { id: 'dining', name: 'Dining', sqft: 70, x: 21, y: 12, w: 8, h: 11 },
      { id: 'entry', name: 'Entry · Laundry', x: 29, y: 12, w: 8, h: 11 },
      { id: 'bath2', name: 'Bath 2', sqft: 42, x: 37, y: 12, w: 7, h: 6 },
      { id: 'wic2', name: 'W.I.C.', sqft: 35, x: 37, y: 18, w: 7, h: 5 },
    ],
    dims: [
      { x1: 0, y1: -8, x2: 44, y2: -8, label: "44'-0\"" },
      { x1: 48, y1: 0, x2: 48, y2: 23, label: "23'-0\"" },
      { x1: 16, y1: -6.2, x2: 28, y2: -6.2, label: "12'-0\" balcony" },
      { x1: -3.5, y1: 0, x2: -3.5, y2: 12, label: "12'-0\"" },
    ],
    furniture: [
      { id: 'fl-bed1', kind: 'bed', label: 'King', x: 3, y: 2.5, w: 6.5, h: 7 },
      { id: 'fl-bed2', kind: 'bed', label: 'Queen', x: 33.5, y: 2.5, w: 5, h: 6.5 },
      { id: 'fl-sofa', kind: 'sofa', label: 'Sofa', x: 14.5, y: 1, w: 7, h: 3 },
      { id: 'fl-coffee', kind: 'table', label: '', x: 16, y: 5, w: 4, h: 2 },
      { id: 'fl-dining', kind: 'table', label: 'Dining', x: 22, y: 15, w: 6, h: 3.5 },
      { id: 'fl-island', kind: 'island', label: 'Island', x: 10.5, y: 15.5, w: 7, h: 2.8 },
      { id: 'fl-cafe', kind: 'round', label: 'Bistro', x: 20.5, y: -3.8, w: 2.6, h: 2.6 },
    ],
  },
  {
    id: 'ground',
    name: 'The Ground Floor',
    facts: 'Restaurant · retail · lobbies · courtyard between the buildings',
    w: 100,
    h: 45,
    rooms: [
      { id: 'retailB', name: 'Retail', sqft: 653, x: 0, y: 0, w: 22, h: 18 },
      { id: 'lobbyB', name: 'Lobby 7904', sqft: 168, x: 22, y: 0, w: 8, h: 12 },
      { id: 'unit101', name: 'Residence 101 · 2BR · ADA', sqft: 937, x: 0, y: 18, w: 30, h: 27 },
      { id: 'courtyard', name: 'Courtyard', x: 30, y: 0, w: 18, h: 45, outdoor: true },
      { id: 'retailA', name: 'Restaurant Space', sqft: 1611, x: 48, y: 0, w: 40, h: 30 },
      { id: 'lobbyA', name: 'Lobby 7900', sqft: 110, x: 88, y: 0, w: 12, h: 12 },
      { id: 'serviceA', name: 'Service', x: 88, y: 12, w: 12, h: 18 },
      { id: 'bohA', name: 'Back of House', x: 48, y: 30, w: 52, h: 15 },
    ],
    dims: [
      { x1: 0, y1: -4, x2: 100, y2: -4, label: "≈121'-0\" on Maple St." },
      { x1: 30, y1: -1.5, x2: 48, y2: -1.5, label: "18'-0\" courtyard" },
      { x1: 104, y1: 0, x2: 104, y2: 45, label: "≈58'-0\"" },
    ],
    furniture: [
      { id: 'gr-cafe1', kind: 'round', label: 'Café', x: 33, y: 6, w: 2.8, h: 2.8 },
      { id: 'gr-cafe2', kind: 'round', label: 'Café', x: 41, y: 12, w: 2.8, h: 2.8 },
      { id: 'gr-cafe3', kind: 'round', label: 'Café', x: 34, y: 20, w: 2.8, h: 2.8 },
      { id: 'gr-cafe4', kind: 'round', label: 'Café', x: 41, y: 28, w: 2.8, h: 2.8 },
      { id: 'gr-cafe5', kind: 'round', label: 'Café', x: 34, y: 36, w: 2.8, h: 2.8 },
      { id: 'gr-bench', kind: 'sofa', label: 'Bench', x: 36, y: 41.5, w: 6, h: 1.8 },
    ],
  },
]

const ACCENT = '#54AAB1'
const INK = '#1f2933'

function FurnitureShape({ f, selected }: { f: Furn; selected: boolean }) {
  const stroke = selected ? ACCENT : '#5f6b76'
  const fill = selected ? 'rgba(84,170,177,0.18)' : 'rgba(95,107,118,0.10)'
  const common = { stroke, fill, strokeWidth: 0.22, vectorEffect: 'non-scaling-stroke' as const }
  const cx = f.x + f.w / 2
  const cy = f.y + f.h / 2
  return (
    <g transform={f.rot ? `rotate(${f.rot} ${cx} ${cy})` : undefined} style={{ cursor: 'grab' }}>
      {f.kind === 'round' ? (
        <circle cx={cx} cy={cy} r={f.w / 2} {...common} />
      ) : (
        <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.kind === 'sofa' ? 0.9 : 0.35} {...common} />
      )}
      {f.kind === 'bed' && (
        <line x1={f.x + 0.4} y1={f.y + 1.6} x2={f.x + f.w - 0.4} y2={f.y + 1.6} stroke={stroke} strokeWidth={0.18} />
      )}
      {f.kind === 'island' && (
        <line x1={f.x + 0.5} y1={cy} x2={f.x + f.w - 0.5} y2={cy} stroke={stroke} strokeWidth={0.14} strokeDasharray="0.5 0.4" />
      )}
      {f.label && (
        <text x={cx} y={cy + 0.4} textAnchor="middle" fontSize={0.95} fill="#9aa6b1" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {f.label}
        </text>
      )}
    </g>
  )
}

function DimLine({ d }: { d: Dim }) {
  const vertical = d.x1 === d.x2
  const tick = 1.1
  return (
    <g stroke={ACCENT} strokeWidth={0.16} vectorEffect="non-scaling-stroke">
      <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} />
      {vertical ? (
        <>
          <line x1={d.x1 - tick / 2} y1={d.y1} x2={d.x1 + tick / 2} y2={d.y1} />
          <line x1={d.x2 - tick / 2} y1={d.y2} x2={d.x2 + tick / 2} y2={d.y2} />
          <text
            x={d.x1 + 1.2}
            y={(d.y1 + d.y2) / 2}
            fontSize={1.5}
            fill={ACCENT}
            stroke="none"
            textAnchor="middle"
            transform={`rotate(90 ${d.x1 + 1.2} ${(d.y1 + d.y2) / 2})`}
          >
            {d.label}
          </text>
        </>
      ) : (
        <>
          <line x1={d.x1} y1={d.y1 - tick / 2} x2={d.x1} y2={d.y1 + tick / 2} />
          <line x1={d.x2} y1={d.y2 - tick / 2} x2={d.x2} y2={d.y2 + tick / 2} />
          <text x={(d.x1 + d.x2) / 2} y={d.y1 - 0.7} fontSize={1.5} fill={ACCENT} stroke="none" textAnchor="middle">
            {d.label}
          </text>
        </>
      )}
    </g>
  )
}

export default function FloorPlanExplorer() {
  const [planIdx, setPlanIdx] = useState(0)
  const [showLabels, setShowLabels] = useState(true)
  const [showDims, setShowDims] = useState(false)
  const [showFurniture, setShowFurniture] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [furnState, setFurnState] = useState<Record<string, Furn[]>>(() =>
    Object.fromEntries(PLANS.map((p) => [p.id, p.furniture.map((f) => ({ ...f }))]))
  )
  const [dragId, setDragId] = useState<string | null>(null)
  const dragOffset = useRef({ dx: 0, dy: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const tracked = useRef<Set<string>>(new Set())

  const plan = PLANS[planIdx]
  const furniture = furnState[plan.id]
  // Padding accommodates dimension lines outside the walls.
  const vb = useMemo(() => {
    const pad = 10
    return { x: -pad, y: -pad, w: plan.w + pad * 2, h: plan.h + pad + 4 }
  }, [plan])

  const track = (action: string) => {
    const key = `${plan.id}:${action}`
    if (!tracked.current.has(key)) {
      tracked.current.add(key)
      trackEvent('plaza_floorplan_interact', { plan: plan.id, action })
    }
  }

  const toSvgPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * vb.w + vb.x,
      y: ((clientY - rect.top) / rect.height) * vb.h + vb.y,
    }
  }

  const onFurnPointerDown = (e: React.PointerEvent, f: Furn) => {
    e.preventDefault()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    const p = toSvgPoint(e.clientX, e.clientY)
    dragOffset.current = { dx: p.x - f.x, dy: p.y - f.y }
    setDragId(f.id)
    track('furniture_drag')
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragId) return
    const p = toSvgPoint(e.clientX, e.clientY)
    setFurnState((s) => ({
      ...s,
      [plan.id]: s[plan.id].map((f) =>
        f.id === dragId
          ? {
              ...f,
              x: Math.min(Math.max(p.x - dragOffset.current.dx, vb.x + 1), vb.x + vb.w - f.w - 1),
              y: Math.min(Math.max(p.y - dragOffset.current.dy, vb.y + 1), vb.y + vb.h - f.h - 1),
            }
          : f
      ),
    }))
  }

  const rotateFurn = (id: string) => {
    setFurnState((s) => ({
      ...s,
      [plan.id]: s[plan.id].map((f) => (f.id === id ? { ...f, rot: ((f.rot || 0) + 90) % 360 } : f)),
    }))
    track('furniture_rotate')
  }

  const resetFurniture = () => {
    setFurnState((s) => ({ ...s, [plan.id]: plan.furniture.map((f) => ({ ...f })) }))
  }

  const selected = plan.rooms.find((r) => r.id === selectedRoom)

  const toggle = (
    label: string,
    value: boolean,
    setter: (v: boolean) => void,
    action: string
  ) => (
    <button
      type="button"
      onClick={() => {
        setter(!value)
        if (!value) track(action)
      }}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
        value ? 'bg-ink-900 text-white shadow-soft' : 'bg-white text-ink-500 ring-1 ring-ink-200 hover:text-ink-800'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div>
      {/* Plan switcher */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        {PLANS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPlanIdx(i)
              setSelectedRoom(null)
            }}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
              i === planIdx ? 'bg-accent text-white shadow-glow' : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:text-ink-900'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Layer toggles */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        {toggle('Room labels', showLabels, setShowLabels, 'labels')}
        {toggle('Dimensions', showDims, setShowDims, 'dimensions')}
        {toggle('Furniture', showFurniture, setShowFurniture, 'furniture')}
        {showFurniture && (
          <button
            type="button"
            onClick={resetFurniture}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-400 ring-1 ring-ink-200 transition-colors hover:text-ink-700"
          >
            Reset layout
          </button>
        )}
      </div>

      {/* Info bar */}
      <div className="mx-auto mb-4 flex min-h-[2.25rem] max-w-xl items-center justify-center text-center">
        {selected ? (
          <p className="animate-scale-in rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
            {selected.name}
            {selected.sqft ? ` · ≈${selected.sqft.toLocaleString()} sq ft` : ''}
          </p>
        ) : (
          <p className="text-sm text-ink-400">
            {plan.facts} — tap a room{showFurniture ? ', drag the furniture, double-tap to rotate' : ''}.
          </p>
        )}
      </div>

      {/* Drawing */}
      <div className="mx-auto max-w-4xl rounded-3xl border border-ink-100 bg-white p-4 shadow-soft sm:p-8">
        <svg
          ref={svgRef}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Interactive floor plan: ${plan.name}`}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragId(null)}
          onPointerLeave={() => setDragId(null)}
          style={{ touchAction: dragId ? 'none' : 'pan-y' }}
        >
          {/* Rooms */}
          {plan.rooms.map((r) => {
            const isSel = r.id === selectedRoom
            return (
              <g key={r.id} onClick={() => { setSelectedRoom(isSel ? null : r.id); track('room_tap') }} style={{ cursor: 'pointer' }}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill={isSel ? 'rgba(84,170,177,0.16)' : r.outdoor ? 'rgba(84,170,177,0.05)' : '#fbfcfd'}
                  stroke={r.outdoor ? ACCENT : '#8b98a5'}
                  strokeWidth={r.outdoor ? 0.22 : 0.3}
                  strokeDasharray={r.outdoor ? '1 0.7' : undefined}
                  vectorEffect="non-scaling-stroke"
                />
                {showLabels && (
                  <text
                    x={r.x + r.w / 2}
                    y={r.y + r.h / 2 + (r.sqft && showDims ? -0.4 : 0.5)}
                    textAnchor="middle"
                    fontSize={Math.min(1.7, r.w / 7)}
                    fontWeight={600}
                    fill={INK}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {r.name}
                  </text>
                )}
                {showLabels && showDims && r.sqft && (
                  <text
                    x={r.x + r.w / 2}
                    y={r.y + r.h / 2 + 1.8}
                    textAnchor="middle"
                    fontSize={1.25}
                    fill="#8b98a5"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {r.sqft.toLocaleString()} SF
                  </text>
                )}
              </g>
            )
          })}

          {/* Outer wall emphasis */}
          <rect
            x={0}
            y={0}
            width={plan.w}
            height={plan.h}
            fill="none"
            stroke={INK}
            strokeWidth={0.65}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />

          {/* Dimensions */}
          {showDims && plan.dims.map((d, i) => <DimLine key={i} d={d} />)}

          {/* Furniture */}
          {showFurniture &&
            furniture.map((f) => (
              <g
                key={f.id}
                onPointerDown={(e) => onFurnPointerDown(e, f)}
                onDoubleClick={() => rotateFurn(f.id)}
                style={{ touchAction: 'none' }}
              >
                <FurnitureShape f={f} selected={dragId === f.id} />
              </g>
            ))}
        </svg>
      </div>
      <p className="mt-5 text-center text-xs text-ink-400">
        Redrawn from the approved permit set by Graham Hill Architect. Simplified and approximate — layouts,
        dimensions, and finishes subject to refinement during construction.
      </p>
    </div>
  )
}
