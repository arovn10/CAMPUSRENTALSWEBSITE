import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/investors/crm/contacts - List all contacts
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const tag = searchParams.get('tag')

    let whereClause = '1=1'
    const params: any[] = []
    let paramIndex = 1

    if (search) {
      whereClause += ` AND (
        LOWER(c."firstName") LIKE LOWER($${paramIndex}) OR
        LOWER(c."lastName") LIKE LOWER($${paramIndex}) OR
        LOWER(c.email) LIKE LOWER($${paramIndex}) OR
        LOWER(c.company) LIKE LOWER($${paramIndex})
      )`
      params.push(`%${search}%`)
      paramIndex++
    }

    if (tag) {
      whereClause += ` AND $${paramIndex} = ANY(c.tags)`
      params.push(tag)
      paramIndex++
    }

    const contacts = await query<{
      id: string
      firstName: string
      lastName: string
      email: string | null
      phone: string | null
      company: string | null
      title: string | null
      address: string | null
      city: string | null
      state: string | null
      zipCode: string | null
      country: string
      notes: string | null
      tags: string[]
      createdBy: string
      createdAt: Date
      updatedAt: Date
      creator: {
        id: string
        firstName: string
        lastName: string
        email: string
      }
    }>(`
      SELECT 
        c.id,
        c."firstName",
        c."lastName",
        c.email,
        c.phone,
        c.company,
        c.title,
        c.address,
        c.city,
        c.state,
        c."zipCode",
        c.country,
        c.notes,
        c.tags,
        c."createdBy",
        c."createdAt",
        c."updatedAt",
        jsonb_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'email', u.email
        ) as creator
      FROM contacts c
      LEFT JOIN users u ON c."createdBy" = u.id
      WHERE ${whereClause}
      ORDER BY c."lastName" ASC, c."firstName" ASC
    `, params)

    return NextResponse.json({ contacts })
  } catch (error: any) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/investors/crm/contacts - Create a new contact
export async function POST(request: NextRequest) {
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

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    const contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const contact = await queryOne(`
      INSERT INTO contacts (
        id, "firstName", "lastName", email, phone, company, title,
        address, city, state, "zipCode", country, notes, tags, "createdBy",
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      )
      RETURNING *
    `, [
      contactId,
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
      user.id,
    ])

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

