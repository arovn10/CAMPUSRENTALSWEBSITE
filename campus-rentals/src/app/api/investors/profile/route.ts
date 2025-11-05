import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/investors/profile
 * Get current user's profile information
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch full user profile
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        company: true,
        // Address fields
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        // Mailing address for K1s
        mailingAddress: true,
        mailingCity: true,
        mailingState: true,
        mailingZipCode: true,
        mailingCountry: true,
        // Tax and K1 fields
        taxId: true,
        entityName: true,
        entityType: true,
        entityTaxId: true,
        // Other fields
        dateOfBirth: true,
        emergencyContact: true,
        emergencyPhone: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/investors/profile
 * Update current user's profile information
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()

    // Only allow updating own profile
    if (body.id && body.id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Prepare update data (only include fields that are provided)
    const updateData: any = {}

    if (body.firstName !== undefined) updateData.firstName = body.firstName
    if (body.lastName !== undefined) updateData.lastName = body.lastName
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.company !== undefined) updateData.company = body.company

    // Address fields
    if (body.address !== undefined) updateData.address = body.address
    if (body.city !== undefined) updateData.city = body.city
    if (body.state !== undefined) updateData.state = body.state
    if (body.zipCode !== undefined) updateData.zipCode = body.zipCode
    if (body.country !== undefined) updateData.country = body.country

    // Mailing address for K1s
    if (body.mailingAddress !== undefined) updateData.mailingAddress = body.mailingAddress
    if (body.mailingCity !== undefined) updateData.mailingCity = body.mailingCity
    if (body.mailingState !== undefined) updateData.mailingState = body.mailingState
    if (body.mailingZipCode !== undefined) updateData.mailingZipCode = body.mailingZipCode
    if (body.mailingCountry !== undefined) updateData.mailingCountry = body.mailingCountry

    // Tax and K1 fields
    if (body.taxId !== undefined) updateData.taxId = body.taxId // TODO: Encrypt before storing
    if (body.entityName !== undefined) updateData.entityName = body.entityName
    if (body.entityType !== undefined) updateData.entityType = body.entityType
    if (body.entityTaxId !== undefined) updateData.entityTaxId = body.entityTaxId // TODO: Encrypt before storing

    // Other fields
    if (body.dateOfBirth !== undefined) {
      updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
    }
    if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact
    if (body.emergencyPhone !== undefined) updateData.emergencyPhone = body.emergencyPhone

    // Update user profile
    const updatedProfile = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        company: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        mailingAddress: true,
        mailingCity: true,
        mailingState: true,
        mailingZipCode: true,
        mailingCountry: true,
        taxId: true,
        entityName: true,
        entityType: true,
        entityTaxId: true,
        dateOfBirth: true,
        emergencyContact: true,
        emergencyPhone: true,
        profileImage: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

