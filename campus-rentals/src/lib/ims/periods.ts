/** Quarter helpers for statement periods. */

export function currentQuarterLabel(d = new Date()): string {
  const q = Math.floor(d.getMonth() / 3) + 1
  return `Q${q} ${d.getFullYear()}`
}

/** The most recently *completed* quarter (what a quarterly statement covers). */
export function lastCompletedQuarter(now = new Date()): { label: string; start: Date; end: Date } {
  const qIndex = Math.floor(now.getMonth() / 3) // 0..3 of current quarter
  // Move to the previous quarter.
  let year = now.getFullYear()
  let prevQ = qIndex - 1
  if (prevQ < 0) {
    prevQ = 3
    year -= 1
  }
  const startMonth = prevQ * 3
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59) // last day of quarter
  return { label: `Q${prevQ + 1} ${year}`, start, end }
}
