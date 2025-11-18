import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/investors/crm/contacts/[id] - Get a specific contact
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const contact = await queryOne(`
      SELECT 
        c.*,
        jsonb_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'email', u.email
        ) as creator
      FROM contacts c
      LEFT JOIN users u ON c."createdBy" = u.id
      WHERE c.id = $1
    `, [params.id])

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json({ contact })
  } catch (error: any) {
    console.error('Error fetching contact:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/investors/crm/contacts/[id] - Update a contact
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      title,
      address,
      city,
      state,
      zipCode,
      country,
      notes,
      tags,
    } = body

    const contact = await queryOne(`
      UPDATE contacts SET
        "firstName" = $1,
        "lastName" = $2,
        email = $3,
        phone = $4,
        company = $5,
        title = $6,
        address = $7,
        city = $8,
        state = $9,
        "zipCode" = $10,
        country = $11,
        notes = $12,
        tags = $13,
        "updatedAt" = NOW()
      WHERE id = $14
      RETURNING *
    `, [
      firstName,
      lastName,
      email || null,
      phone || null,
      company || null,
      title || null,
      address || null,
      city || null,
      state || null,
      zipCode || null,
      country || 'US',
      notes || null,
      tags ? JSON.stringify(tags) : '[]',
      params.id,
    ])

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json({ contact })
  } catch (error: any) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/investors/crm/contacts/[id] - Delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await query('DELETE FROM contacts WHERE id = $1', [params.id])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

