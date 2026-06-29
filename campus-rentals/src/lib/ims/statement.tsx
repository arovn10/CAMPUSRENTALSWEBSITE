/**
 * In-house branded PDF capital-account statement (no external statement vendor).
 * Rendered server-side with @react-pdf/renderer from the shared capital-account
 * derivation, so the statement always matches the live portal screen.
 */
import React from 'react'
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { CapitalAccountPayload } from '@/lib/ims/capitalAccount'

const ACCENT = '#54AAB1'
const SLATE = '#54595F'

const usd = (n: number | null | undefined) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const pct = (n: number | null | undefined) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`)
const mult = (n: number | null | undefined) => (n == null ? '—' : `${n.toFixed(2)}x`)
const dateFmt = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: '#1f2937', fontFamily: 'Helvetica' },
  brandBar: { borderBottomWidth: 3, borderBottomColor: ACCENT, paddingBottom: 10, marginBottom: 18 },
  brand: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#111827' },
  sub: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  h1: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4, color: '#111827' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 8 },
  kpi: { width: '25%', padding: 4 },
  kpiBox: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 8 },
  kpiAccent: { backgroundColor: ACCENT, borderRadius: 6, padding: 8 },
  kpiLabel: { fontSize: 7, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiLabelAccent: { fontSize: 7, color: '#e6f4f5', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiVal: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', marginTop: 2 },
  kpiValAccent: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginTop: 2 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: SLATE, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
  thead: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 4, paddingHorizontal: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6', paddingVertical: 4, paddingHorizontal: 4 },
  th: { fontSize: 7.5, color: '#6b7280', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
  td: { fontSize: 9, color: '#374151' },
  cDeal: { width: '32%' },
  cNum: { width: '17%', textAlign: 'right' },
  footer: { position: 'absolute', bottom: 28, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, fontSize: 7.5, color: '#9ca3af' },
})

export interface StatementInfo {
  investorName: string
  investorEmail: string
  periodLabel: string
}

function StatementDoc({ info, data }: { info: StatementInfo; data: CapitalAccountPayload }) {
  const c = data.consolidated
  return (
    <Document title={`Capital Account Statement — ${info.periodLabel}`} author="Campus Rentals LLC">
      <Page size="A4" style={styles.page}>
        <View style={styles.brandBar}>
          <Text style={styles.brand}>Campus Rentals</Text>
          <Text style={styles.sub}>Investor Capital Account Statement</Text>
        </View>

        <View style={styles.meta}>
          <View>
            <Text style={styles.h1}>{info.investorName}</Text>
            <Text style={styles.sub}>{info.investorEmail}</Text>
          </View>
          <View>
            <Text style={[styles.sub, { textAlign: 'right' }]}>Period: {info.periodLabel}</Text>
            <Text style={[styles.sub, { textAlign: 'right' }]}>As of {dateFmt(data.asOf)}</Text>
          </View>
        </View>

        {/* Consolidated KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpi}><View style={styles.kpiBox}><Text style={styles.kpiLabel}>Contributed</Text><Text style={styles.kpiVal}>{usd(c.totalContributed)}</Text></View></View>
          <View style={styles.kpi}><View style={styles.kpiBox}><Text style={styles.kpiLabel}>Distributed</Text><Text style={styles.kpiVal}>{usd(c.totalDistributed)}</Text></View></View>
          <View style={styles.kpi}><View style={styles.kpiBox}><Text style={styles.kpiLabel}>Unreturned capital</Text><Text style={styles.kpiVal}>{usd(c.unreturnedCapital)}</Text></View></View>
          <View style={styles.kpi}><View style={styles.kpiBox}><Text style={styles.kpiLabel}>Current value</Text><Text style={styles.kpiVal}>{usd(c.currentValue)}</Text></View></View>
        </View>
        <View style={styles.kpiRow}>
          <View style={styles.kpi}><View style={styles.kpiAccent}><Text style={styles.kpiLabelAccent}>Net IRR</Text><Text style={styles.kpiValAccent}>{pct(c.irr)}</Text></View></View>
          <View style={styles.kpi}><View style={styles.kpiBox}><Text style={styles.kpiLabel}>Equity multiple (TVPI)</Text><Text style={styles.kpiVal}>{mult(c.tvpi)}</Text></View></View>
          <View style={styles.kpi}><View style={styles.kpiBox}><Text style={styles.kpiLabel}>DPI (realized)</Text><Text style={styles.kpiVal}>{mult(c.dpi)}</Text></View></View>
          <View style={styles.kpi}><View style={styles.kpiBox}><Text style={styles.kpiLabel}>Cash-on-cash (TTM)</Text><Text style={styles.kpiVal}>{pct(c.cashOnCash)}</Text></View></View>
        </View>

        {/* Holdings */}
        <Text style={styles.sectionTitle}>Holdings ({data.accounts.length})</Text>
        <View style={styles.thead}>
          <Text style={[styles.th, styles.cDeal]}>Deal</Text>
          <Text style={[styles.th, styles.cNum]}>Contributed</Text>
          <Text style={[styles.th, styles.cNum]}>Distributed</Text>
          <Text style={[styles.th, styles.cNum]}>Current value</Text>
          <Text style={[styles.th, styles.cNum]}>IRR / Mult.</Text>
        </View>
        {data.accounts.map((a) => (
          <View style={styles.tr} key={a.propertyId} wrap={false}>
            <Text style={[styles.td, styles.cDeal]}>{a.propertyName}</Text>
            <Text style={[styles.td, styles.cNum]}>{usd(a.metrics.totalContributed)}</Text>
            <Text style={[styles.td, styles.cNum]}>{usd(a.metrics.totalDistributed)}</Text>
            <Text style={[styles.td, styles.cNum]}>{usd(a.metrics.currentValue)}</Text>
            <Text style={[styles.td, styles.cNum]}>{pct(a.metrics.irr)} / {mult(a.metrics.tvpi)}</Text>
          </View>
        ))}

        <Text style={styles.footer} fixed>
          Campus Rentals LLC · Statement of record. Figures derived from your recorded contributions, distributions, and
          current property valuations; IRR is a true XIRR over dated cash flows. Distributions are paid outside this portal.
          This statement is informational and not a tax document.
        </Text>
      </Page>
    </Document>
  )
}

/** Render the statement to a PDF Buffer. */
export async function renderStatementPdf(info: StatementInfo, data: CapitalAccountPayload): Promise<Buffer> {
  return renderToBuffer(<StatementDoc info={info} data={data} />)
}
