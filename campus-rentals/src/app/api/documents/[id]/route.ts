import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readFile, unlink } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Try to get user from auth header first
    let user = null
    try {
      user = await requireAuth(request)
    } catch (authError) {
      // If auth fails, try to get user from query parameter (for document viewing)
      const url = new URL(request.url)
      const userEmail = url.searchParams.get('user')
      
      if (userEmail) {
        user = await prisma.user.findUnique({
          where: { email: userEmail }
        })
      }
      
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }
    
    // Check if user has permission to view documents
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'INVESTOR') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    console.log('Document request for ID:', params.id)
    
    // Find the document
    const document = await prisma.document.findUnique({
      where: { id: params.id }
    })
    
    if (!document) {
      console.log('Document not found:', params.id)
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check document visibility permissions
    const canView = 
      (user.role === 'ADMIN' && document.visibleToAdmin) ||
      (user.role === 'MANAGER' && document.visibleToManager) ||
      (user.role === 'INVESTOR' && document.visibleToInvestor) ||
      document.isPublic

    if (!canView) {
      console.log('User does not have permission to view document:', {
        userId: user.id,
        userRole: user.role,
        documentId: document.id,
        visibleToAdmin: document.visibleToAdmin,
        visibleToManager: document.visibleToManager,
        visibleToInvestor: document.visibleToInvestor,
        isPublic: document.isPublic
      })
      return NextResponse.json(
        { error: 'Access denied to this document' },
        { status: 403 }
      )
    }
    
    console.log('Found document:', {
      id: document.id,
      fileName: document.fileName,
      filePath: document.filePath,
      mimeType: document.mimeType
    })
    
    // Construct the file path
    const filePath = join(process.cwd(), 'public', document.filePath)
    console.log('File path:', filePath)
    
    try {
      // Read the file
      const fileBuffer = await readFile(filePath)
      console.log('File read successfully, size:', fileBuffer.length)
      
      // Return the file with appropriate headers
      return new NextResponse(fileBuffer as BodyInit, {
        headers: {
          'Content-Type': document.mimeType,
          'Content-Disposition': `inline; filename="${document.fileName}"`,
          'Cache-Control': 'public, max-age=3600'
        }
      })
    } catch (fileError) {
      console.error('Error reading file:', fileError)
      return NextResponse.json(
        { error: 'File not found on server' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error serving document:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    
    console.log('Document update request by:', user.email, 'Role:', user.role)
    console.log('Document ID:', params.id)
    
    // Check if user has permission to edit documents
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      console.log('Insufficient permissions for user:', user.email)
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    console.log('Update request body:', body)
    
    // First check if document exists
    const existingDocument = await prisma.document.findUnique({
      where: { id: params.id }
    })
    
    if (!existingDocument) {
      console.log('Document not found:', params.id)
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }
    
    console.log('Found existing document:', {
      id: existingDocument.id,
      title: existingDocument.title,
      fileName: existingDocument.fileName
    })
    
    // Update the document
    const updatedDocument = await prisma.document.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description,
        documentType: body.documentType as any, // Cast to enum type
        visibleToAdmin: body.visibleToAdmin !== undefined ? body.visibleToAdmin : true,
        visibleToManager: body.visibleToManager !== undefined ? body.visibleToManager : true,
        visibleToInvestor: body.visibleToInvestor !== undefined ? body.visibleToInvestor : true
      }
    })
    
    console.log('Document updated successfully:', updatedDocument.id)
    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error('Error updating document:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to update document', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to delete documents
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Get the document first to get the file path
    const document = await prisma.document.findUnique({
      where: { id: params.id }
    })
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }
    
    // Delete the file from the server
    try {
      const filePath = join(process.cwd(), 'public', document.filePath)
      await unlink(filePath)
      console.log('File deleted from server:', filePath)
    } catch (fileError) {
      console.error('Error deleting file from server:', fileError)
      // Continue with database deletion even if file deletion fails
    }
    
    // Delete the document from the database
    await prisma.document.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 