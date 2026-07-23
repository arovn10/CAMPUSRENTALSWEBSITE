'use client'

/**
 * Interactive floor plans for Campus Rentals Plaza.
 * Redrawn (simplified + approximate) from the approved permit set — not construction documents.
 * Rendering follows architectural drawing conventions: heavy exterior walls, lighter interior
 * partitions, door swings, window glazing, hatched outdoor space, drafting-tick dimensions.
 * Layers: room labels (default on), dimensions (toggle), draggable example furniture (toggle).
 */

import { useMemo, useRef, useState } from 'react'
import { trackEvent } from '@/utils/analytics'

type RoomKind = 'room' | 'wet' | 'core' | 'service' | 'outdoor'
type Room = { id: string; name: string; sqft?: number; x: number; y: number; w: number; h: number; kind?: RoomKind }
/** Swing door: hinge at (x,y), opening runs along wallAngle (deg, 0=+x, 90=+y-down), leaf `len`, side flips the swing. */
type Door = { x: number; y: number; wallAngle: number; len: number; side?: 1 | -1; type?: 'swing' | 'slide' }
type Win = { x: number; y: number; len: number; vertical?: boolean }
type Dim = { x1: number; y1: number; x2: number; y2: number; label: string }
type FurnKind = 'bed' | 'sofa' | 'table' | 'island' | 'round' | 'lounge'
type Furn = { id: string; kind: FurnKind; x: number; y: number; w: number; h: number; rot?: number; chairs?: 'long' | 'ends' | 'stools' | 'none' }
type Street = { label: string; x: number; y: number; vertical?: boolean }
type Plan = {
  id: string
  name: string
  facts: string
  w: number
  h: number
  rooms: Room[]
  doors: Door[]
  windows: Win[]
  dims: Dim[]
  furniture: Furn[]
  streets?: Street[]
}

const PLANS: Plan[] = [
  {
    id: 'penthouse',
    name: 'The Penthouse',
    facts: '4 bed · 4.5 bath · 1,960 sq ft · full top floor',
    w: 47,
    h: 42,
    rooms: [
      { id: 'terrace', name: 'Terrace', sqft: 96, x: 17.5, y: 0, w: 12, h: 8, kind: 'outdoor' },
      { id: 'bed2', name: 'Bedroom 2', sqft: 156, x: 0, y: 0, w: 13, h: 12 },
      { id: 'living', name: 'Living Room', sqft: 204, x: 13, y: 8, w: 17, h: 12 },
      { id: 'bed3', name: 'Bedroom 3', sqft: 168, x: 30, y: 0, w: 17, h: 12 },
      { id: 'pbath', name: 'Primary Bath', sqft: 90, x: 0, y: 12, w: 9, h: 10, kind: 'wet' },
      { id: 'wic', name: 'W.I.C.', sqft: 48, x: 0, y: 22, w: 9, h: 6, kind: 'wet' },
      { id: 'half', name: 'Powder', sqft: 30, x: 9, y: 20, w: 4, h: 8, kind: 'wet' },
      { id: 'core', name: 'Stair · Elevator', x: 13, y: 20, w: 11, h: 8, kind: 'core' },
      { id: 'kitchen', name: 'Kitchen', sqft: 150, x: 24, y: 20, w: 14, h: 8 },
      { id: 'laundry', name: 'Pantry', sqft: 48, x: 30, y: 12, w: 8, h: 8, kind: 'wet' },
      { id: 'bath3', name: 'Bath 3', sqft: 45, x: 38, y: 12, w: 9, h: 6, kind: 'wet' },
      { id: 'bath4', name: 'Bath 4', sqft: 45, x: 38, y: 18, w: 9, h: 5, kind: 'wet' },
      { id: 'pbed', name: 'Primary Bedroom', sqft: 196, x: 0, y: 28, w: 14, h: 14 },
      { id: 'dining', name: 'Dining', sqft: 238, x: 14, y: 28, w: 17, h: 14 },
      { id: 'bed4', name: 'Bedroom 4', sqft: 224, x: 31, y: 28, w: 16, h: 14 },
    ],
    doors: [
      { x: 13, y: 3.4, wallAngle: 90, len: 2.8, side: 1 },
      { x: 30, y: 6.2, wallAngle: 90, len: 2.8, side: -1 },
      { x: 9, y: 13.2, wallAngle: 90, len: 2.6, side: -1 },
      { x: 3.2, y: 22, wallAngle: 0, len: 2.4, side: 1 },
      { x: 10.2, y: 20, wallAngle: 0, len: 2.2, side: 1 },
      { x: 14, y: 30.4, wallAngle: 90, len: 2.8, side: 1 },
      { x: 31, y: 33.2, wallAngle: 90, len: 2.8, side: -1 },
      { x: 38, y: 13.2, wallAngle: 90, len: 2.4, side: -1 },
      { x: 38, y: 19.2, wallAngle: 90, len: 2.2, side: -1 },
      { x: 26, y: 28, wallAngle: 0, len: 2.8, side: -1 },
      { x: 18.5, y: 8, wallAngle: 0, len: 10, type: 'slide' },
    ],
    windows: [
      { x: 2.5, y: 0, len: 6 },
      { x: 34, y: 0, len: 9 },
      { x: 2.5, y: 42, len: 8 },
      { x: 18, y: 42, len: 9 },
      { x: 34.5, y: 42, len: 9 },
      { x: 0, y: 14, len: 6, vertical: true },
      { x: 0, y: 31, len: 8, vertical: true },
      { x: 47, y: 2.5, len: 7, vertical: true },
      { x: 47, y: 31, len: 8, vertical: true },
    ],
    dims: [
      { x1: 0, y1: -4.5, x2: 47, y2: -4.5, label: "47'-0\"" },
      { x1: 51.5, y1: 0, x2: 51.5, y2: 42, label: "42'-0\"" },
      { x1: 17.5, y1: -1.8, x2: 29.5, y2: -1.8, label: "12'-0\" terrace" },
      { x1: -4, y1: 28, x2: -4, y2: 42, label: "14'-0\"" },
    ],
    furniture: [
      { id: 'ph-bed1', kind: 'bed', x: 4, y: 30.5, w: 6.5, h: 7 },
      { id: 'ph-bed2', kind: 'bed', x: 4, y: 1.2, w: 5, h: 6.5 },
      { id: 'ph-bed3', kind: 'bed', x: 36, y: 1.2, w: 5, h: 6.5 },
      { id: 'ph-bed4', kind: 'bed', x: 36.5, y: 30.5, w: 5, h: 6.5 },
      { id: 'ph-sofa', kind: 'sofa', x: 14.5, y: 9.2, w: 8, h: 3 },
      { id: 'ph-coffee', kind: 'table', x: 16.5, y: 13.4, w: 4, h: 2, chairs: 'none' },
      { id: 'ph-dining', kind: 'table', x: 18.5, y: 32.5, w: 8, h: 4, chairs: 'long' },
      { id: 'ph-island', kind: 'island', x: 27, y: 23.6, w: 8, h: 2.8 },
      { id: 'ph-lounge1', kind: 'lounge', x: 19.4, y: 1.4, w: 2.2, h: 5 },
      { id: 'ph-lounge2', kind: 'lounge', x: 24.4, y: 1.4, w: 2.2, h: 5 },
    ],
  },
  {
    id: 'flat',
    name: 'The Flat',
    facts: '2 bed · 2 bath · 937–992 sq ft',
    w: 44,
    h: 23,
    rooms: [
      { id: 'balcony', name: 'Balcony', sqft: 60, x: 16, y: -5, w: 12, h: 5, kind: 'outdoor' },
      { id: 'pbed', name: 'Primary Bedroom', sqft: 156, x: 0, y: 0, w: 13, h: 12 },
      { id: 'living', name: 'Living Room', sqft: 192, x: 13, y: 0, w: 16, h: 12 },
      { id: 'bed2', name: 'Bedroom 2', sqft: 180, x: 29, y: 0, w: 15, h: 12 },
      { id: 'pbath', name: 'Primary Bath', sqft: 48, x: 0, y: 12, w: 8, h: 6, kind: 'wet' },
      { id: 'wic', name: 'W.I.C.', sqft: 40, x: 0, y: 18, w: 8, h: 5, kind: 'wet' },
      { id: 'kitchen', name: 'Kitchen', sqft: 110, x: 8, y: 12, w: 13, h: 11 },
      { id: 'dining', name: 'Dining', sqft: 70, x: 21, y: 12, w: 8, h: 11 },
      { id: 'entry', name: 'Entry', x: 29, y: 12, w: 8, h: 11, kind: 'core' },
      { id: 'bath2', name: 'Bath 2', sqft: 42, x: 37, y: 12, w: 7, h: 6, kind: 'wet' },
      { id: 'wic2', name: 'W.I.C.', sqft: 35, x: 37, y: 18, w: 7, h: 5, kind: 'wet' },
    ],
    doors: [
      { x: 13, y: 8.8, wallAngle: 90, len: 2.6, side: -1 },
      { x: 29, y: 8.8, wallAngle: 90, len: 2.6, side: 1 },
      { x: 2.4, y: 12, wallAngle: 0, len: 2.4, side: -1 },
      { x: 2.4, y: 18, wallAngle: 0, len: 2.2, side: 1 },
      { x: 37, y: 13, wallAngle: 90, len: 2.2, side: -1 },
      { x: 37, y: 19, wallAngle: 90, len: 2, side: -1 },
      { x: 31.5, y: 23, wallAngle: 0, len: 2.8, side: -1 },
      { x: 17, y: 0, wallAngle: 0, len: 10, type: 'slide' },
    ],
    windows: [
      { x: 2.5, y: 0, len: 8 },
      { x: 31.5, y: 0, len: 10 },
      { x: 0, y: 2.5, len: 7, vertical: true },
      { x: 44, y: 2.5, len: 7, vertical: true },
      { x: 10, y: 23, len: 7 },
      { x: 21.5, y: 23, len: 6 },
    ],
    dims: [
      { x1: 0, y1: -8.5, x2: 44, y2: -8.5, label: "44'-0\"" },
      { x1: 48.5, y1: 0, x2: 48.5, y2: 23, label: "23'-0\"" },
      { x1: 16, y1: -6.4, x2: 28, y2: -6.4, label: "12'-0\" balcony" },
      { x1: -4, y1: 0, x2: -4, y2: 12, label: "12'-0\"" },
    ],
    furniture: [
      { id: 'fl-bed1', kind: 'bed', x: 3.2, y: 1.2, w: 6.5, h: 7 },
      { id: 'fl-bed2', kind: 'bed', x: 34, y: 1.2, w: 5, h: 6.5 },
      { id: 'fl-sofa', kind: 'sofa', x: 14.3, y: 1, w: 7, h: 3 },
      { id: 'fl-coffee', kind: 'table', x: 15.8, y: 5.2, w: 4, h: 2, chairs: 'none' },
      { id: 'fl-dining', kind: 'table', x: 22.2, y: 15.4, w: 5.5, h: 3.4, chairs: 'ends' },
      { id: 'fl-island', kind: 'island', x: 10.6, y: 15.8, w: 7, h: 2.6 },
      { id: 'fl-bistro', kind: 'round', x: 20.6, y: -3.6, w: 2.4, h: 2.4 },
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
      { id: 'lobbyB', name: 'Lobby 7904', sqft: 168, x: 22, y: 0, w: 8, h: 12, kind: 'core' },
      { id: 'unit101', name: 'Residence 101', sqft: 937, x: 0, y: 18, w: 30, h: 27 },
      { id: 'courtyard', name: 'Courtyard', x: 30, y: 0, w: 18, h: 45, kind: 'outdoor' },
      { id: 'retailA', name: 'Restaurant', sqft: 1611, x: 48, y: 0, w: 40, h: 30 },
      { id: 'lobbyA', name: 'Lobby 7900', sqft: 110, x: 88, y: 0, w: 12, h: 12, kind: 'core' },
      { id: 'serviceA', name: 'Service', x: 88, y: 12, w: 12, h: 18, kind: 'service' },
      { id: 'bohA', name: 'Back of House', x: 48, y: 30, w: 52, h: 15, kind: 'service' },
    ],
    doors: [
      { x: 30, y: 3, wallAngle: 90, len: 2.8, side: 1 },
      { x: 48, y: 8, wallAngle: 90, len: 2.8, side: -1 },
      { x: 30, y: 21, wallAngle: 90, len: 2.8, side: 1 },
      { x: 24, y: 0, wallAngle: 0, len: 3, type: 'slide' },
      { x: 91.5, y: 0, wallAngle: 0, len: 3, type: 'slide' },
      { x: 6, y: 0, wallAngle: 0, len: 4, type: 'slide' },
      { x: 62, y: 0, wallAngle: 0, len: 6, type: 'slide' },
    ],
    windows: [
      { x: 1.5, y: 0, len: 4 },
      { x: 12, y: 0, len: 8 },
      { x: 50.5, y: 0, len: 10 },
      { x: 70, y: 0, len: 16 },
      { x: 0, y: 21, len: 9, vertical: true },
      { x: 0, y: 33, len: 9, vertical: true },
      { x: 100, y: 2, len: 8, vertical: true },
      { x: 100, y: 14, len: 12, vertical: true },
    ],
    dims: [
      { x1: 0, y1: -4.5, x2: 100, y2: -4.5, label: "≈121'-0\" on Maple St." },
      { x1: 30, y1: -1.8, x2: 48, y2: -1.8, label: "18'-0\" courtyard" },
      { x1: 104.5, y1: 0, x2: 104.5, y2: 45, label: "≈58'-0\"" },
    ],
    furniture: [
      { id: 'gr-cafe1', kind: 'round', x: 33, y: 6, w: 2.8, h: 2.8 },
      { id: 'gr-cafe2', kind: 'round', x: 41, y: 12, w: 2.8, h: 2.8 },
      { id: 'gr-cafe3', kind: 'round', x: 34, y: 20, w: 2.8, h: 2.8 },
      { id: 'gr-cafe4', kind: 'round', x: 41, y: 28, w: 2.8, h: 2.8 },
      { id: 'gr-cafe5', kind: 'round', x: 34, y: 36, w: 2.8, h: 2.8 },
      { id: 'gr-bench', kind: 'sofa', x: 36, y: 41.6, w: 6, h: 1.6 },
    ],
    streets: [
      { label: 'MAPLE STREET', x: 50, y: -8.2 },
      { label: 'FERN ST.', x: 108.5, y: 22.5, vertical: true },
    ],
  },
]

const ACCENT = '#54AAB1'
const WALL = '#2a333d'
const PARTITION = '#4a5560'
const LABEL = '#39434d'
const MUTED = '#9aa5af'

const ROOM_FILL: Record<RoomKind, string> = {
  room: '#ffffff',
  wet: '#f4f6f8',
  core: '#eef1f3',
  service: '#f7f8f9',
  outdoor: 'transparent',
}

const rad = (deg: number) => (deg * Math.PI) / 180

/** Split a room name onto two lines when the box is narrow. */
function labelLines(name: string, w: number, fs: number): string[] {
  if (name.length * fs * 0.72 <= w - 0.7 || !name.includes(' ')) return [name]
  const words = name.split(' ').filter((x) => x !== '·')
  if (words.length < 2) return [name]
  let best = 1
  let bestDiff = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ').length
    const b = words.slice(i).join(' ').length
    const diff = Math.abs(a - b)
    if (diff < bestDiff) { bestDiff = diff; best = i }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')]
}

function RoomLabel({ r, showArea }: { r: Room; showArea: boolean }) {
  const base = Math.min(1.45, r.h / 3.2)
  const lines = labelLines(r.name, r.w, base)
  const longest = Math.max(...lines.map((l) => l.length))
  const fs = Math.max(0.7, Math.min(base, (r.w - 0.7) / (longest * 0.72)))
  const area = showArea && r.sqft && r.h >= 4.5 && r.w >= 6
  const lineH = fs * 1.25
  const block = lines.length * lineH + (area ? fs * 1.05 : 0)
  const y0 = r.y + r.h / 2 - block / 2 + fs
  return (
    <g style={{ pointerEvents: 'none', userSelect: 'none' }}>
      {lines.map((ln, i) => (
        <text
          key={i}
          x={r.x + r.w / 2}
          y={y0 + i * lineH}
          textAnchor="middle"
          fontSize={fs}
          fontWeight={600}
          letterSpacing="0.09em"
          fill={LABEL}
        >
          {ln.toUpperCase()}
        </text>
      ))}
      {area && (
        <text x={r.x + r.w / 2} y={y0 + lines.length * lineH + fs * 0.15} textAnchor="middle" fontSize={fs * 0.78} fill={MUTED}>
          {r.sqft!.toLocaleString()} SF
        </text>
      )}
    </g>
  )
}

function DoorMark({ d }: { d: Door }) {
  const ux = Math.cos(rad(d.wallAngle))
  const uy = Math.sin(rad(d.wallAngle))
  const gx = d.x + ux * d.len
  const gy = d.y + uy * d.len
  if (d.type === 'slide') {
    // Sliding / folding glass: two offset leaves overlapping at the middle.
    const px = -uy
    const py = ux
    const mx = d.x + ux * d.len * 0.58
    const my = d.y + uy * d.len * 0.58
    const m2x = d.x + ux * d.len * 0.42
    const m2y = d.y + uy * d.len * 0.42
    return (
      <g>
        <line x1={d.x} y1={d.y} x2={gx} y2={gy} stroke="#fff" strokeWidth={4} vectorEffect="non-scaling-stroke" />
        <line x1={d.x + px * 0.22} y1={d.y + py * 0.22} x2={mx + px * 0.22} y2={my + py * 0.22} stroke={PARTITION} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={m2x - px * 0.22} y1={m2y - py * 0.22} x2={gx - px * 0.22} y2={gy - py * 0.22} stroke={PARTITION} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </g>
    )
  }
  const side = d.side ?? 1
  const openAngle = d.wallAngle + 90 * side
  const tx = d.x + Math.cos(rad(openAngle)) * d.len
  const ty = d.y + Math.sin(rad(openAngle)) * d.len
  const sweep = side === 1 ? 0 : 1
  return (
    <g>
      <line x1={d.x} y1={d.y} x2={gx} y2={gy} stroke="#fff" strokeWidth={4} vectorEffect="non-scaling-stroke" />
      <line x1={d.x} y1={d.y} x2={tx} y2={ty} stroke={PARTITION} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
      <path d={`M ${tx} ${ty} A ${d.len} ${d.len} 0 0 ${sweep} ${gx} ${gy}`} fill="none" stroke={MUTED} strokeWidth={0.7} strokeDasharray="2 2.4" vectorEffect="non-scaling-stroke" />
    </g>
  )
}

function WindowMark({ w }: { w: Win }) {
  const x2 = w.vertical ? w.x : w.x + w.len
  const y2 = w.vertical ? w.y + w.len : w.y
  const ox = w.vertical ? 0.18 : 0
  const oy = w.vertical ? 0 : 0.18
  return (
    <g>
      <line x1={w.x} y1={w.y} x2={x2} y2={y2} stroke="#fff" strokeWidth={4.5} vectorEffect="non-scaling-stroke" />
      <line x1={w.x - ox} y1={w.y - oy} x2={x2 - ox} y2={y2 - oy} stroke={WALL} strokeWidth={0.9} vectorEffect="non-scaling-stroke" />
      <line x1={w.x + ox} y1={w.y + oy} x2={x2 + ox} y2={y2 + oy} stroke={WALL} strokeWidth={0.9} vectorEffect="non-scaling-stroke" />
    </g>
  )
}

function DimLine({ d }: { d: Dim }) {
  const vertical = d.x1 === d.x2
  const t = 0.4 // drafting tick half-length
  const Tick = ({ x, y }: { x: number; y: number }) => (
    <line x1={x - t} y1={y + t} x2={x + t} y2={y - t} stroke={ACCENT} strokeWidth={1} vectorEffect="non-scaling-stroke" />
  )
  return (
    <g>
      <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={ACCENT} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
      <Tick x={d.x1} y={d.y1} />
      <Tick x={d.x2} y={d.y2} />
      {vertical ? (
        <text
          x={d.x1 + 1.1}
          y={(d.y1 + d.y2) / 2}
          fontSize={1.25}
          letterSpacing="0.06em"
          fill={ACCENT}
          textAnchor="middle"
          transform={`rotate(90 ${d.x1 + 1.1} ${(d.y1 + d.y2) / 2})`}
        >
          {d.label}
        </text>
      ) : (
        <text x={(d.x1 + d.x2) / 2} y={d.y1 - 0.65} fontSize={1.25} letterSpacing="0.06em" fill={ACCENT} textAnchor="middle">
          {d.label}
        </text>
      )}
    </g>
  )
}

function FurnitureShape({ f, active }: { f: Furn; active: boolean }) {
  const stroke = active ? ACCENT : '#7d8893'
  const sw = active ? 1.2 : 0.9
  const fill = active ? 'rgba(84,170,177,0.10)' : 'rgba(255,255,255,0.65)'
  const cx = f.x + f.w / 2
  const cy = f.y + f.h / 2
  const P = { stroke, strokeWidth: sw, vectorEffect: 'non-scaling-stroke' as const }
  const chair = (x: number, y: number, w = 1.5, h = 1.2) => (
    <rect key={`${x}-${y}`} x={x - w / 2} y={y - h / 2} width={w} height={h} rx={0.35} fill="none" {...P} strokeWidth={0.7} />
  )
  let body: React.ReactNode
  if (f.kind === 'bed') {
    body = (
      <>
        <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.3} fill={fill} {...P} />
        <line x1={f.x} y1={f.y + 0.55} x2={f.x + f.w} y2={f.y + 0.55} {...P} strokeWidth={1.4} />
        <rect x={f.x + f.w * 0.1} y={f.y + 0.95} width={f.w * 0.34} height={1.15} rx={0.3} fill="none" {...P} strokeWidth={0.7} />
        <rect x={f.x + f.w * 0.56} y={f.y + 0.95} width={f.w * 0.34} height={1.15} rx={0.3} fill="none" {...P} strokeWidth={0.7} />
        <line x1={f.x} y1={f.y + f.h * 0.62} x2={f.x + f.w} y2={f.y + f.h * 0.62} {...P} strokeWidth={0.6} />
      </>
    )
  } else if (f.kind === 'sofa') {
    body = (
      <>
        <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.7} fill={fill} {...P} />
        <line x1={f.x + 0.7} y1={f.y + 0.7} x2={f.x + f.w - 0.7} y2={f.y + 0.7} {...P} strokeWidth={0.6} />
        <line x1={f.x + 0.7} y1={f.y + 0.7} x2={f.x + 0.7} y2={f.y + f.h - 0.3} {...P} strokeWidth={0.6} />
        <line x1={f.x + f.w - 0.7} y1={f.y + 0.7} x2={f.x + f.w - 0.7} y2={f.y + f.h - 0.3} {...P} strokeWidth={0.6} />
        <line x1={cx} y1={f.y + 0.7} x2={cx} y2={f.y + f.h - 0.3} {...P} strokeWidth={0.5} />
      </>
    )
  } else if (f.kind === 'island') {
    const stools = [0.22, 0.5, 0.78].map((p) => (
      <circle key={p} cx={f.x + f.w * p} cy={f.y + f.h + 0.85} r={0.55} fill="none" {...P} strokeWidth={0.7} />
    ))
    body = (
      <>
        <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.25} fill={fill} {...P} />
        {stools}
      </>
    )
  } else if (f.kind === 'round') {
    const r = f.w / 2
    body = (
      <>
        <circle cx={cx} cy={cy} r={r} fill={fill} {...P} />
        {chair(cx - r - 0.85, cy, 1.2, 1.4)}
        {chair(cx + r + 0.85, cy, 1.2, 1.4)}
      </>
    )
  } else if (f.kind === 'lounge') {
    body = (
      <>
        <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.5} fill={fill} {...P} />
        <line x1={f.x} y1={f.y + f.h * 0.32} x2={f.x + f.w} y2={f.y + f.h * 0.32} {...P} strokeWidth={0.6} />
      </>
    )
  } else {
    // table
    const chairs =
      f.chairs === 'long'
        ? [0.2, 0.5, 0.8].flatMap((p) => [chair(f.x + f.w * p, f.y - 0.95), chair(f.x + f.w * p, f.y + f.h + 0.95)])
        : f.chairs === 'ends'
          ? [chair(f.x + f.w * 0.3, f.y - 0.95), chair(f.x + f.w * 0.7, f.y - 0.95), chair(f.x + f.w * 0.3, f.y + f.h + 0.95), chair(f.x + f.w * 0.7, f.y + f.h + 0.95)]
          : []
    body = (
      <>
        <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.3} fill={fill} {...P} />
        {chairs}
      </>
    )
  }
  return (
    <g transform={f.rot ? `rotate(${f.rot} ${cx} ${cy})` : undefined} style={{ cursor: 'grab' }}>
      {body}
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
  const dragMoved = useRef(false)
  const lastTap = useRef<{ id: string; t: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const tracked = useRef<Set<string>>(new Set())

  const plan = PLANS[planIdx]
  const furniture = furnState[plan.id]

  // Bounds including rooms that sit outside the main envelope (e.g. the flat's balcony).
  const bounds = useMemo(() => {
    let minX = 0, minY = 0, maxX = plan.w, maxY = plan.h
    for (const r of plan.rooms) {
      minX = Math.min(minX, r.x); minY = Math.min(minY, r.y)
      maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h)
    }
    return { minX, minY, maxX, maxY }
  }, [plan])

  const vb = useMemo(() => {
    const pad = 11
    return { x: bounds.minX - pad, y: bounds.minY - pad, w: bounds.maxX - bounds.minX + pad * 2, h: bounds.maxY - bounds.minY + pad + 4.5 }
  }, [bounds])

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

  const rotateFurn = (id: string) => {
    setFurnState((s) => ({
      ...s,
      [plan.id]: s[plan.id].map((f) => (f.id === id ? { ...f, rot: ((f.rot || 0) + 90) % 360 } : f)),
    }))
    track('furniture_rotate')
  }

  const onFurnPointerDown = (e: React.PointerEvent, f: Furn) => {
    e.preventDefault()
    e.stopPropagation()
    // Double-tap → rotate (dblclick doesn't fire for touch on SVG).
    const now = performance.now()
    if (lastTap.current && lastTap.current.id === f.id && now - lastTap.current.t < 350) {
      lastTap.current = null
      rotateFurn(f.id)
      return
    }
    lastTap.current = { id: f.id, t: now }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    const p = toSvgPoint(e.clientX, e.clientY)
    dragOffset.current = { dx: p.x - f.x, dy: p.y - f.y }
    dragMoved.current = false
    setDragId(f.id)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragId) return
    const p = toSvgPoint(e.clientX, e.clientY)
    if (!dragMoved.current) {
      dragMoved.current = true
      track('furniture_drag')
    }
    setFurnState((s) => ({
      ...s,
      [plan.id]: s[plan.id].map((f) =>
        f.id === dragId
          ? {
              ...f,
              x: Math.min(Math.max(p.x - dragOffset.current.dx, bounds.minX + 0.5), bounds.maxX - f.w - 0.5),
              y: Math.min(Math.max(p.y - dragOffset.current.dy, bounds.minY + 0.5), bounds.maxY - f.h - 0.5),
            }
          : f
      ),
    }))
  }

  const resetFurniture = () => {
    setFurnState((s) => ({ ...s, [plan.id]: plan.furniture.map((f) => ({ ...f })) }))
    setDragId(null)
    track('furniture_reset')
  }

  const selected = plan.rooms.find((r) => r.id === selectedRoom)

  const toggle = (label: string, value: boolean, setter: (v: boolean) => void, action: string) => (
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
              setDragId(null)
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
            {plan.facts} — tap a room{showFurniture ? ' · drag furniture · double-tap to rotate' : ''}.
          </p>
        )}
      </div>

      {/* Drawing */}
      <div className="mx-auto max-w-4xl rounded-3xl border border-ink-100 bg-white p-3 shadow-soft sm:p-6">
        <svg
          ref={svgRef}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Interactive floor plan: ${plan.name}`}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragId(null)}
          onPointerCancel={() => setDragId(null)}
          onPointerLeave={() => setDragId(null)}
          style={{ touchAction: showFurniture ? 'none' : 'pan-y' }}
        >
          <defs>
            <pattern id="fp-hatch" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="2.2" stroke={ACCENT} strokeWidth="0.14" opacity="0.5" />
            </pattern>
          </defs>

          {/* Rooms */}
          {plan.rooms.map((r) => {
            const isSel = r.id === selectedRoom
            const kind = r.kind ?? 'room'
            const outdoor = kind === 'outdoor'
            return (
              <g key={r.id} onClick={() => { setSelectedRoom(isSel ? null : r.id); track('room_tap') }} style={{ cursor: 'pointer' }}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill={isSel ? 'rgba(84,170,177,0.14)' : outdoor ? 'rgba(84,170,177,0.04)' : ROOM_FILL[kind]}
                  stroke={outdoor ? ACCENT : PARTITION}
                  strokeWidth={outdoor ? 0.9 : 1.1}
                  strokeDasharray={outdoor ? '3 2.6' : undefined}
                  vectorEffect="non-scaling-stroke"
                />
                {outdoor && !isSel && (
                  <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#fp-hatch)" pointerEvents="none" />
                )}
                {showLabels && <RoomLabel r={r} showArea={showDims} />}
              </g>
            )
          })}

          {/* Heavy exterior envelope */}
          <rect
            x={0}
            y={0}
            width={plan.w}
            height={plan.h}
            fill="none"
            stroke={WALL}
            strokeWidth={2.6}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />

          {/* Openings */}
          <g pointerEvents="none">
            {plan.windows.map((w, i) => <WindowMark key={i} w={w} />)}
            {plan.doors.map((d, i) => <DoorMark key={i} d={d} />)}
          </g>

          {/* Dimensions */}
          {showDims && <g pointerEvents="none">{plan.dims.map((d, i) => <DimLine key={i} d={d} />)}</g>}

          {/* Street labels + north arrow (site-level plans) */}
          {plan.streets?.map((s) => (
            <text
              key={s.label}
              x={s.x}
              y={s.y}
              textAnchor="middle"
              fontSize={1.6}
              letterSpacing="0.35em"
              fill={MUTED}
              transform={s.vertical ? `rotate(90 ${s.x} ${s.y})` : undefined}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {s.label}
            </text>
          ))}

          {/* Furniture */}
          {showFurniture &&
            furniture.map((f) => (
              <g key={f.id} onPointerDown={(e) => onFurnPointerDown(e, f)} style={{ touchAction: 'none' }}>
                <FurnitureShape f={f} active={dragId === f.id} />
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
