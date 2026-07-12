import { NextRequest, NextResponse } from 'next/server';
import { ABODE_API_BASE_URL } from '@/lib/apiConfig';

/**
 * Lead capture proxy → Abodingo backend (public endpoints).
 * - type "tour"    → POST /api/property-tours/create
 * - type "inquiry" → POST /api/property-inquiries/create
 * Server-side proxy keeps the browser same-origin and lets us validate + rate-shape.
 */

type LeadBody = {
  type?: 'tour' | 'inquiry';
  propertyId?: number | string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  scheduledDate?: string;
  // Honeypot — real users never fill this
  company?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: LeadBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: pretend success, store nothing
  if (body.company) {
    return NextResponse.json({ success: true });
  }

  const type = body.type;
  const propertyId = String(body.propertyId ?? '').trim();
  const name = (body.name ?? '').trim().slice(0, 120);
  const email = (body.email ?? '').trim().slice(0, 200);
  const phone = (body.phone ?? '').trim().slice(0, 40) || undefined;
  const message = (body.message ?? '').trim().slice(0, 2000) || undefined;

  if (!type || !['tour', 'inquiry'].includes(type)) {
    return NextResponse.json({ error: 'Invalid lead type' }, { status: 400 });
  }
  if (!propertyId || !name || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: 'Name, a valid email, and property are required.' },
      { status: 400 }
    );
  }

  const base = ABODE_API_BASE_URL.replace(/\/$/, '');
  let url: string;
  let payload: Record<string, unknown>;

  if (type === 'tour') {
    // The form sends a naive datetime-local string (no timezone). That is the
    // guest's wall-clock intent for the PROPERTY's local time — do NOT convert
    // to UTC (this server runs UTC; converting shifted tours by 5-6 hours).
    // Validate leniently (±14h skew) and pass the wall-clock string through.
    const raw = (body.scheduledDate ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw) || isNaN(new Date(raw).getTime())) {
      return NextResponse.json(
        { error: 'Please pick a date and time for your tour.' },
        { status: 400 }
      );
    }
    if (new Date(raw).getTime() < Date.now() - 14 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Please pick a future date and time for your tour.' },
        { status: 400 }
      );
    }
    url = `${base}/property-tours/create`;
    payload = {
      propertyId,
      scheduledDate: raw.length === 16 ? `${raw}:00` : raw,
      tourGuestName: name,
      tourGuestEmail: email,
      tourGuestPhone: phone,
      notes: message,
    };
  } else {
    url = `${base}/property-inquiries/create`;
    payload = {
      propertyId,
      inquirerName: name,
      inquirerEmail: email,
      inquirerPhone: phone,
      message,
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`Lead proxy: backend returned ${res.status} for ${type}`, await res.text().catch(() => ''));
      return NextResponse.json(
        { error: 'We could not submit your request right now. Please try again or email us directly.' },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lead proxy error:', error);
    return NextResponse.json(
      { error: 'We could not submit your request right now. Please try again or email us directly.' },
      { status: 502 }
    );
  }
}
