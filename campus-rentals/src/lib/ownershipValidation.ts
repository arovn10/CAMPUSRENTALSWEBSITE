/**
 * Ownership percentage helpers — keep write APIs from inventing 100%
 * or silently accepting stacks that blow past 100%.
 */

export const OWNERSHIP_SUM_TOLERANCE = 0.05 // allow 99.95–100.05

export function parseOwnershipPercentage(
  value: unknown,
  opts: { required?: boolean; allowNull?: boolean } = {}
): number | null {
  if (value === null || value === undefined || value === '') {
    if (opts.allowNull || !opts.required) return null
    throw new Error('ownershipPercentage is required')
  }
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error('ownershipPercentage must be a number between 0 and 100')
  }
  return n
}

export function ownershipSumOk(sum: number): boolean {
  return sum <= 100 + OWNERSHIP_SUM_TOLERANCE
}

export function assertOwnershipSum(sum: number, label = 'Ownership'): void {
  if (!ownershipSumOk(sum)) {
    throw new Error(`${label} percentages would total ${sum.toFixed(2)}% (max 100%)`)
  }
}
