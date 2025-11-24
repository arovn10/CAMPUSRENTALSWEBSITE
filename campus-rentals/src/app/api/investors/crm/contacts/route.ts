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

    const whereConditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (search) {
      whereConditions.push(`(
        LOWER(c."firstName") LIKE LOWER($${paramIndex}) OR
        LOWER(c."lastName") LIKE LOWER($${paramIndex}) OR
        LOWER(c.email) LIKE LOWER($${paramIndex}) OR
        LOWER(c.company) LIKE LOWER($${paramIndex})
      )`)
      params.push(`%${search}%`)
      paramIndex++
    }

    if (tag) {
      whereConditions.push(`$${paramIndex} = ANY(c.tags)`)
      params.push(tag)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : ''

    // Check if additional columns exist
    const hasPipelineId = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts' 
        AND column_name = 'pipelineId'
      ) as exists
    `)
    
    const hasPropertyId = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts' 
        AND column_name = 'propertyId'
      ) as exists
    `)
    
    const hasServiceType = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts' 
        AND column_name = 'serviceType'
      ) as exists
    `)

    // Build the SELECT clause dynamically
    let selectColumns = [
      'c.id',
      'c."firstName"',
      'c."lastName"',
      'c.email',
      'c.phone',
      'c.company',
      'c.title',
      'c.address',
      'c.city',
      'c.state',
      'c."zipCode"',
      'c.country',
      'c.notes',
      'COALESCE(c.tags, \'[]\'::jsonb) as tags',
      'c."createdBy"',
      'c."createdAt"',
      'c."updatedAt"',
    ]
    
    if (hasPipelineId?.exists) {
      selectColumns.push('c."pipelineId"')
    }
    if (hasPropertyId?.exists) {
      selectColumns.push('c."propertyId"')
    }
    if (hasServiceType?.exists) {
      selectColumns.push('c."serviceType"')
    }
    
    selectColumns.push(`
      jsonb_build_object(
        'id', u.id,
        'firstName', u."firstName",
        'lastName', u."lastName",
        'email', u.email
      ) as creator
    `)
    
    if (hasPipelineId?.exists) {
      selectColumns.push(`
        CASE WHEN c."pipelineId" IS NOT NULL THEN
          jsonb_build_object(
            'id', p.id,
            'name', p.name
          )
        ELSE NULL END as pipeline
      `)
    }
    
    if (hasPropertyId?.exists) {
      selectColumns.push(`
        CASE WHEN c."propertyId" IS NOT NULL THEN
          jsonb_build_object(
            'id', prop.id,
            'name', prop.name,
            'address', prop.address
          )
        ELSE NULL END as property
      `)
    }
    
    let joinClauses = ['LEFT JOIN users u ON c."createdBy" = u.id']
    if (hasPipelineId?.exists) {
      joinClauses.push('LEFT JOIN deal_pipelines p ON c."pipelineId" = p.id')
    }
    if (hasPropertyId?.exists) {
      joinClauses.push('LEFT JOIN properties prop ON c."propertyId" = prop.id')
    }
    
    const contacts = await query(`
      SELECT ${selectColumns.join(', ')}
      FROM contacts c
      ${joinClauses.join(' ')}
      ${whereClause}
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
      pipelineId,
      propertyId,
      serviceType,
    } = body

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    const contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Check if pipelineId and propertyId columns exist
    const hasPipelineId = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts' 
        AND column_name = 'pipelineId'
      ) as exists
    `)
    
    const hasPropertyId = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts' 
        AND column_name = 'propertyId'
      ) as exists
    `)
    
    const hasServiceType = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts' 
        AND column_name = 'serviceType'
      ) as exists
    `)

    // Build dynamic INSERT query based on available columns
    let columns = ['id', '"firstName"', '"lastName"', 'email', 'phone', 'company', 'title',
      'address', 'city', '"state"', '"zipCode"', 'country', 'notes', 'tags', '"createdBy"',
      '"createdAt"', '"updatedAt"']
    let values = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8', '$9', '$10', '$11', '$12', '$13', '$14', '$15', 'NOW()', 'NOW()']
    let params: any[] = [
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
    ]
    let paramIndex = 16

    if (hasPipelineId?.exists && pipelineId) {
      columns.push('"pipelineId"')
      values.push(`$${paramIndex}`)
      params.push(pipelineId)
      paramIndex++
    }

    if (hasPropertyId?.exists && propertyId) {
      columns.push('"propertyId"')
      values.push(`$${paramIndex}`)
      params.push(propertyId)
      paramIndex++
    }

    if (hasServiceType?.exists && serviceType) {
      columns.push('"serviceType"')
      values.push(`$${paramIndex}`)
      params.push(serviceType)
      paramIndex++
    }

    const contact = await queryOne(`
      INSERT INTO contacts (${columns.join(', ')})
      VALUES (${values.join(', ')})
      RETURNING *
    `, params)

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

