import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { investorS3Service } from '@/lib/investorS3Service'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    
    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      )
    }
    
    // Get tax records for the property
    const taxRecords = await prisma.propertyTax.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(taxRecords)
  } catch (error) {
    console.error('Error fetching tax records:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to create tax records
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Handle FormData for file uploads
    const formData = await request.formData()
    const propertyId = formData.get('propertyId') as string
    const taxYear = formData.get('taxYear') as string
    const annualPropertyTax = formData.get('annualPropertyTax') as string
    const notes = formData.get('notes') as string
    const documentFile = formData.get('document') as File | null
    
    let documentUrl: string | null = null
    let documentFileName: string | null = null
    let documentS3Key: string | null = null
    
    // Upload document to S3 if provided
    if (documentFile && documentFile.size > 0) {
      try {
        const buffer = Buffer.from(await documentFile.arrayBuffer())
        const uploadResult = await investorS3Service.uploadFile({
          fileName: documentFile.name,
          buffer,
          contentType: documentFile.type || 'application/pdf',
          propertyId
        })
        
        documentUrl = uploadResult.url
        documentFileName = uploadResult.fileName
        documentS3Key = uploadResult.key
      } catch (uploadError) {
        console.error('Error uploading tax document to S3:', uploadError)
        return NextResponse.json(
          { error: 'Failed to upload document', details: uploadError instanceof Error ? uploadError.message : 'Unknown error' },
          { status: 500 }
        )
      }
    }
    
    // Create tax record
    const taxRecord = await prisma.propertyTax.create({
      data: {
        propertyId,
        taxYear: parseInt(taxYear),
        annualPropertyTax: parseFloat(annualPropertyTax),
        notes: notes || '',
        createdBy: user.id,
        documentUrl,
        documentFileName,
        documentS3Key
      }
    })
    
    return NextResponse.json(taxRecord, { status: 201 })
  } catch (error) {
    console.error('Error creating tax record:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 