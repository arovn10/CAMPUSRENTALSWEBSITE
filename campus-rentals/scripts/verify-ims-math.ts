import { xirr, computeAccountMetrics, consolidate, positionIrrPercent, type AccountFlows } from '../src/lib/ims/metrics'
import { renderStatementPdf } from '../src/lib/ims/statement'

let pass = 0, fail = 0
const ok = (cond: boolean, name: string, got?: any, exp?: any) => {
  if (cond) { pass++ } else { fail++; console.log(`  FAIL ${name}  got=${got} exp=${exp}`) }
}
const near = (a: number|null, b: number, tol: number, name: string) =>
  ok(a != null && Math.abs(a-b) <= tol, name, a, b)

console.log('\n[1] Metric-engine edge cases (the figures shown to investors)')

// Sold deal: contribution + full distribution, zero current value → DPI=TVPI, RVPI=0
{
  const m = computeAccountMetrics({
    contributions: [{ amount: 100000, date: new Date('2021-01-01') }],
    distributions: [{ amount: 160000, date: new Date('2024-01-01') }],
    currentValue: 0, asOf: new Date('2024-06-01'),
  })
  near(m.dpi, 1.6, 1e-9, 'sold: DPI=1.6')
  near(m.rvpi, 0, 1e-9, 'sold: RVPI=0')
  near(m.tvpi, 1.6, 1e-9, 'sold: TVPI=1.6')
  near(m.irr, 0.1696, 0.01, 'sold: IRR ~16.9%/yr over 3y (160k/100k)')
}

// Multiple contributions + partial distributions + residual value
{
  const m = computeAccountMetrics({
    contributions: [
      { amount: 50000, date: new Date('2020-01-01') },
      { amount: 50000, date: new Date('2020-07-01') },
    ],
    distributions: [
      { amount: 10000, date: new Date('2022-01-01') },
      { amount: 10000, date: new Date('2023-01-01') },
    ],
    currentValue: 130000, asOf: new Date('2024-01-01'),
  })
  near(m.totalContributed, 100000, 1e-9, 'multi: contributed=100k')
  near(m.totalDistributed, 20000, 1e-9, 'multi: distributed=20k')
  near(m.dpi, 0.2, 1e-9, 'multi: DPI=0.2')
  near(m.rvpi, 1.3, 1e-9, 'multi: RVPI=1.3')
  near(m.tvpi, 1.5, 1e-9, 'multi: TVPI=1.5')
  ok(m.irr != null && m.irr > 0.08 && m.irr < 0.13, 'multi: IRR in plausible 8-13% band', m.irr)
}

// No distributions, only unrealized: TVPI from value alone; DPI=0
{
  const m = computeAccountMetrics({
    contributions: [{ amount: 200000, date: new Date('2023-01-01') }],
    distributions: [], currentValue: 240000, asOf: new Date('2024-01-01'),
  })
  near(m.dpi, 0, 1e-9, 'unrealized: DPI=0')
  near(m.tvpi, 1.2, 1e-9, 'unrealized: TVPI=1.2')
  near(m.irr, 0.20, 0.005, 'unrealized: IRR=20%/yr (240/200 over 1y)')
}

// Cash-on-cash = trailing-12m distributions / contributed
{
  const asOf = new Date('2024-06-01')
  const m = computeAccountMetrics({
    contributions: [{ amount: 100000, date: new Date('2020-01-01') }],
    distributions: [
      { amount: 3000, date: new Date('2022-01-01') },          // >12m ago, excluded
      { amount: 4000, date: new Date('2023-12-01') },          // within ttm
      { amount: 4000, date: new Date('2024-03-01') },          // within ttm
    ],
    currentValue: 100000, asOf,
  })
  near(m.cashOnCash, 0.08, 1e-9, 'coc: TTM 8000/100000 = 8%')
}

console.log('\n[2] Derivation & attribution arithmetic (buildCapitalAccount formulas)')
// Worked syndication example for investor X:
//  - Direct investment in Deal A: $100k, 10% ownership; Deal A currentValue $2,000,000
//  - Entity "Fund LLC": X owns 25% (ownershipPercentage), X contributed $50k to the entity.
//      Fund LLC invested in Deal B ($300k, entity owns 15% of B) and Deal C ($100k, entity owns 5% of C).
//      Deal B currentValue $1,500,000 ; Deal C currentValue $800,000
//  Replicate the exact formulas in capitalAccount.ts:
const ownerPct = 25 / 100            // X's % of the entity
const ownerContribution = 50000      // capital X put into the entity
const eiB = { invAmt: 300000, ownPct: 15, propVal: 1_500_000 }
const eiC = { invAmt: 100000, ownPct: 5,  propVal: 800_000 }
const totalEntityInvested = eiB.invAmt + eiC.invAmt
// Deal A (direct)
const A_ownership = 10 / 100
const A_contrib = 100000
const A_value = 2_000_000 * Math.min(Math.max(A_ownership,0),1)
near(A_value, 200000, 1e-9, 'A: currentValue = 2,000,000 * 10% = 200,000')
// Deal B via entity
const B_ownership = ownerPct * (eiB.ownPct/100)               // 0.25 * 0.15 = 0.0375
const B_contrib = (eiB.invAmt/totalEntityInvested) * ownerContribution  // (300/400)*50k = 37,500
const B_value = eiB.propVal * B_ownership                     // 1,500,000 * 0.0375 = 56,250
near(B_ownership, 0.0375, 1e-12, 'B: ownership fraction = 3.75%')
near(B_contrib, 37500, 1e-9, 'B: attributed contribution = 37,500')
near(B_value, 56250, 1e-9, 'B: currentValue share = 56,250')
// Deal C via entity
const C_ownership = ownerPct * (eiC.ownPct/100)               // 0.25*0.05 = 0.0125
const C_contrib = (eiC.invAmt/totalEntityInvested) * ownerContribution  // (100/400)*50k = 12,500
const C_value = eiC.propVal * C_ownership                     // 800,000*0.0125 = 10,000
near(C_contrib, 12500, 1e-9, 'C: attributed contribution = 12,500')
near(C_value, 10000, 1e-9, 'C: currentValue share = 10,000')
// Entity contributions must sum back to what X actually put in (no money invented/lost)
near(B_contrib + C_contrib, ownerContribution, 1e-9, 'attribution conserves entity capital (37.5k+12.5k=50k)')

// Consolidated across A,B,C (X contributed 100k direct + 50k entity = 150k)
const asOf = new Date('2024-01-01')
const accounts: AccountFlows[] = [
  { contributions: [{amount:A_contrib, date:new Date('2021-01-01')}], distributions: [{amount:8000,date:new Date('2023-06-01')}], currentValue:A_value, asOf },
  { contributions: [{amount:B_contrib, date:new Date('2022-01-01')}], distributions: [], currentValue:B_value, asOf },
  { contributions: [{amount:C_contrib, date:new Date('2022-01-01')}], distributions: [], currentValue:C_value, asOf },
]
const con = consolidate(accounts)
near(con.totalContributed, 150000, 1e-9, 'consolidated contributed = 150,000')
near(con.currentValue, A_value+B_value+C_value, 1e-9, 'consolidated value = 266,250')
near(con.totalDistributed, 8000, 1e-9, 'consolidated distributed = 8,000')
ok(con.irr != null && isFinite(con.irr), 'consolidated IRR solves to a finite number', con.irr)

console.log('\n[3] PDF statement renders for the worked account')
;(async () => {
  const payload: any = {
    asOf, userId: 'X', consolidated: con,
    accounts: [
      { propertyId:'A', propertyName:'Deal A', address:null, dealStatus:'STABILIZED', ownershipPercent:10, metrics: computeAccountMetrics(accounts[0]), ledger:[] },
      { propertyId:'B', propertyName:'Deal B', address:null, dealStatus:'STABILIZED', ownershipPercent:3.75, metrics: computeAccountMetrics(accounts[1]), ledger:[] },
      { propertyId:'C', propertyName:'Deal C', address:null, dealStatus:'STABILIZED', ownershipPercent:1.25, metrics: computeAccountMetrics(accounts[2]), ledger:[] },
    ],
  }
  const buf = await renderStatementPdf({ investorName:'Test LP', investorEmail:'lp@example.com', periodLabel:'Q4 2024' }, payload)
  ok(buf.slice(0,5).toString('latin1').startsWith('%PDF'), 'PDF: valid header')
  ok(buf.length > 2000, 'PDF: non-trivial size', buf.length)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
