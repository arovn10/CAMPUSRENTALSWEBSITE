import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Campus Rentals Plaza waitlist. Public write: stores the signup and fires a
 * best-effort notification email. Honeypot + field caps keep bots cheap.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INTERESTS = new Set(['RENT', 'BUY', 'EITHER'])

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Honeypot — pretend success, store nothing.
  if (typeof body.company === 'string' && body.company) {
    return NextResponse.json({ success: true })
  }

  const name = String(body.name ?? '').trim().slice(0, 120)
  const email = String(body.email ?? '').trim().slice(0, 200)
  const phone = String(body.phone ?? '').trim().slice(0, 40) || null
  const message = String(body.message ?? '').trim().slice(0, 1000) || null
  const interest = String(body.interest ?? '').trim().toUpperCase()

  if (!name || !EMAIL_RE.test(email) || !INTERESTS.has(interest)) {
    return NextResponse.json(
      { error: 'Name, a valid email, and rent/buy interest are required.' },
      { status: 400 }
    )
  }

  try {
    // One row per email — repeat signups update interest/details instead of duplicating.
    const existing = await prisma.plazaWaitlist.findFirst({ where: { email } })
    if (existing) {
      await prisma.plazaWaitlist.update({
        where: { id: existing.id },
        data: { name, phone, message, interest },
      })
    } else {
      await prisma.plazaWaitlist.create({ data: { name, email, phone, message, interest } })
    }
  } catch (error) {
    console.error('Plaza waitlist write failed:', error)
    return NextResponse.json(
      { error: 'Could not save your signup right now. Please try again shortly.' },
      { status: 500 }
    )
  }

  // Best-effort notification — signup already persisted, never fail the request.
  try {
    const { sendEmail } = await import('@/lib/email')
    await sendEmail({
      to: 'rovnerproperties@gmail.com',
      subject: `Plaza waitlist: ${name} (${interest.toLowerCase()})`,
      html: `<p><strong>${name}</strong> joined the Campus Rentals Plaza waitlist.</p>
             <p>Interest: <strong>${interest}</strong><br/>Email: ${email}${phone ? `<br/>Phone: ${phone}` : ''}</p>
             ${message ? `<p>Note: ${message}</p>` : ''}`,
    })
  } catch (error) {
    console.error('Plaza waitlist notification failed (signup saved):', error)
  }

  return NextResponse.json({ success: true })
}
