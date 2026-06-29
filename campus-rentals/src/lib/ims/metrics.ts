/**
 * IMS capital-account metrics — pure, dependency-free, unit-testable.
 *
 * Replaces the legacy `(totalReturn / invested) * 100` IRR approximation with a
 * true XIRR (NPV solver over dated cash flows) plus the standard PE/real-estate
 * multiples: MOIC/TVPI, DPI, RVPI, and trailing cash-on-cash.
 *
 * Callers convert Prisma `Decimal` money to `number` (Number(d)) before passing in.
 */

const MS_PER_DAY = 86_400_000
const DAYS_PER_YEAR = 365

export interface CashFlow {
  /** Positive = cash received by the investor; negative = capital contributed. */
  amount: number
  date: Date
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** NPV of dated cash flows at an annual `rate`, discounting from the earliest date. */
function npv(rate: number, flows: CashFlow[], t0: number): number {
  return sum(
    flows.map((f) => {
      const years = (f.date.getTime() - t0) / (DAYS_PER_YEAR * MS_PER_DAY)
      return f.amount / Math.pow(1 + rate, years)
    })
  )
}

/**
 * Internal rate of return over irregularly-dated cash flows (XIRR).
 * Returns the annual rate as a fraction (0.142 = 14.2%), or null if it can't be solved
 * (needs at least one positive and one negative flow). Newton's method with a
 * bisection fallback for robustness.
 */
export function xirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null
  if (!flows.some((f) => f.amount > 0) || !flows.some((f) => f.amount < 0)) return null

  const sorted = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime())
  const t0 = sorted[0].date.getTime()

  // Newton's method
  let rate = 0.1
  for (let i = 0; i < 100; i++) {
    const f = npv(rate, sorted, t0)
    const deriv = sum(
      sorted.map((cf) => {
        const years = (cf.date.getTime() - t0) / (DAYS_PER_YEAR * MS_PER_DAY)
        return (-years * cf.amount) / Math.pow(1 + rate, years + 1)
      })
    )
    if (Math.abs(deriv) < 1e-12) break
    const next = rate - f / deriv
    if (!isFinite(next)) break
    if (Math.abs(next - rate) < 1e-8) return next
    rate = next
  }

  // Fallback: bisection on [-0.9999, 10] if Newton didn't converge cleanly
  if (!isFinite(rate) || rate <= -0.9999 || Math.abs(npv(rate, sorted, t0)) > 1) {
    let lo = -0.9999
    let hi = 10
    let flo = npv(lo, sorted, t0)
    const fhi = npv(hi, sorted, t0)
    if (flo * fhi > 0) return null // no sign change → no real root in range
    for (let i = 0; i < 300; i++) {
      const mid = (lo + hi) / 2
      const fmid = npv(mid, sorted, t0)
      if (Math.abs(fmid) < 1e-7) return mid
      if (flo * fmid < 0) {
        hi = mid
      } else {
        lo = mid
        flo = fmid
      }
      rate = mid
    }
  }
  return rate
}

export interface AccountFlows {
  /** Capital contributed by the investor (amounts positive, dated). */
  contributions: CashFlow[]
  /** Cash distributed to the investor (amounts positive, dated). */
  distributions: CashFlow[]
  /** Unrealized current value of the position as of `asOf`. */
  currentValue: number
  asOf: Date
}

export interface AccountMetrics {
  totalContributed: number
  totalDistributed: number
  currentValue: number
  unreturnedCapital: number
  /** Equity multiple == TVPI == (distributions + current value) / contributed. */
  moic: number | null
  tvpi: number | null
  /** Distributions to paid-in. */
  dpi: number | null
  /** Residual value to paid-in. */
  rvpi: number | null
  /** True XIRR as a fraction (0.142 = 14.2%). */
  irr: number | null
  /** Trailing-12-month distributions / contributed capital. */
  cashOnCash: number | null
}

/** Compute the full institutional metric set for one capital account. */
export function computeAccountMetrics(a: AccountFlows): AccountMetrics {
  const totalContributed = sum(a.contributions.map((c) => c.amount))
  const totalDistributed = sum(a.distributions.map((d) => d.amount))
  const cv = a.currentValue

  const dpi = totalContributed > 0 ? totalDistributed / totalContributed : null
  const rvpi = totalContributed > 0 ? cv / totalContributed : null
  const tvpi = totalContributed > 0 ? (totalDistributed + cv) / totalContributed : null

  const flows: CashFlow[] = [
    ...a.contributions.map((c) => ({ amount: -Math.abs(c.amount), date: c.date })),
    ...a.distributions.map((d) => ({ amount: Math.abs(d.amount), date: d.date })),
    ...(cv > 0 ? [{ amount: cv, date: a.asOf }] : []),
  ]
  const irr = xirr(flows)

  const yearAgo = new Date(a.asOf.getTime() - DAYS_PER_YEAR * MS_PER_DAY)
  const ttmDistributions = sum(
    a.distributions.filter((d) => d.date >= yearAgo).map((d) => d.amount)
  )
  const cashOnCash = totalContributed > 0 ? ttmDistributions / totalContributed : null

  return {
    totalContributed,
    totalDistributed,
    currentValue: cv,
    unreturnedCapital: Math.max(totalContributed - totalDistributed, 0),
    moic: tvpi,
    tvpi,
    dpi,
    rvpi,
    irr,
    cashOnCash,
  }
}

/**
 * Convenience for existing endpoints: the annualized **XIRR for one position**,
 * expressed as a percentage (14.2 means 14.2%). This is the correctness fix that
 * replaces the legacy `(totalReturn / invested) * 100` approximation — that number
 * was a lifetime return ratio, never annualized.
 *
 * Falls back to the legacy total-return ratio ONLY when XIRR can't be solved
 * (e.g. a single same-day cash flow, or no terminal value), so a caller always
 * gets a usable, non-worse figure. Returns 0 when there is no contributed capital.
 */
export function positionIrrPercent(a: AccountFlows): number {
  const m = computeAccountMetrics(a)
  if (m.irr != null) return Math.round(m.irr * 100 * 100) / 100
  if (m.totalContributed > 0) {
    const ratio = (m.totalDistributed + m.currentValue - m.totalContributed) / m.totalContributed
    return Math.round(ratio * 100 * 100) / 100
  }
  return 0
}

/** Roll up several accounts' metrics into a consolidated view (sum + re-derive). */
export function consolidate(accounts: AccountFlows[]): AccountMetrics {
  return computeAccountMetrics({
    contributions: accounts.flatMap((a) => a.contributions),
    distributions: accounts.flatMap((a) => a.distributions),
    currentValue: sum(accounts.map((a) => a.currentValue)),
    asOf: accounts.reduce(
      (latest, a) => (a.asOf > latest ? a.asOf : latest),
      accounts[0]?.asOf ?? new Date(0)
    ),
  })
}
