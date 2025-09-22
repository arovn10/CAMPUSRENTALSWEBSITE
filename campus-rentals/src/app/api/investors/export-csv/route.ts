import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get all properties with their investments and investors
    const properties = await prisma.property.findMany({
      where: { isActive: true },
      include: {
        investments: {
          include: {
            user: true
          }
        },
        entityInvestments: {
          include: {
            entity: {
              include: {
                entityOwners: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { address: 'asc' }
    })

    // Calculate current value for each property
    const calculateCurrentValue = (property: any) => {
      const monthlyRent = property.monthlyRent || 0
      const otherIncome = property.otherIncome || 0
      const annualExpenses = property.annualExpenses || 0
      const capRate = property.capRate || 0

      const annualRent = monthlyRent * 12
      const annualOtherIncome = otherIncome * 12
      const annualRevenue = annualRent + annualOtherIncome
      const noi = annualRevenue - annualExpenses
      const estimatedValue = capRate > 0 ? (noi / (capRate / 100)) : 0

      return estimatedValue
    }

    // Prepare CSV data
    const csvRows = []
    
    // Add header row
    csvRows.push([
      'Property Address',
      'Property Name',
      'Property Type',
      'Square Feet',
      'Bedrooms',
      'Bathrooms',
      'Acquisition Price',
      'Construction Cost',
      'Total Cost',
      'Current Value (Calculated)',
      'Debt Amount',
      'Debt Details',
      'Monthly Rent',
      'Cap Rate',
      'Occupancy Rate',
      'Investor Name',
      'Investor Email',
      'Investment Amount',
      'Ownership Percentage',
      'Investment Type',
      'Investment Date',
      'Status'
    ])

    // Process each property
    properties.forEach(property => {
      const currentValue = calculateCurrentValue(property)
      
      // Process direct investments
      property.investments.forEach(investment => {
        csvRows.push([
          property.address,
          property.name,
          property.propertyType,
          property.squareFeet || '',
          property.bedrooms,
          property.bathrooms,
          property.acquisitionPrice || '',
          property.constructionCost || '',
          property.totalCost || '',
          currentValue,
          property.debtAmount || '',
          property.debtDetails || '',
          property.monthlyRent || '',
          property.capRate || '',
          property.occupancyRate || '',
          `${investment.user.firstName} ${investment.user.lastName}`,
          investment.user.email,
          investment.investmentAmount,
          investment.ownershipPercentage || '',
          'DIRECT',
          investment.investmentDate?.toISOString().split('T')[0] || '',
          investment.status
        ])
      })

      // Process entity investments
      property.entityInvestments.forEach(entityInvestment => {
        entityInvestment.entity.entityOwners.forEach(owner => {
          csvRows.push([
            property.address,
            property.name,
            property.propertyType,
            property.squareFeet || '',
            property.bedrooms,
            property.bathrooms,
            property.acquisitionPrice || '',
            property.constructionCost || '',
            property.totalCost || '',
            currentValue,
            property.debtAmount || '',
            property.debtDetails || '',
            property.monthlyRent || '',
            property.capRate || '',
            property.occupancyRate || '',
            `${owner.user.firstName} ${owner.user.lastName}`,
            owner.user.email,
            entityInvestment.investmentAmount,
            entityInvestment.ownershipPercentage || '',
            'ENTITY',
            entityInvestment.investmentDate?.toISOString().split('T')[0] || '',
            entityInvestment.status
          ])
        })
      })

      // If no investments, add property row with empty investor data
      if (property.investments.length === 0 && property.entityInvestments.length === 0) {
        csvRows.push([
          property.address,
          property.name,
          property.propertyType,
          property.squareFeet || '',
          property.bedrooms,
          property.bathrooms,
          property.acquisitionPrice || '',
          property.constructionCost || '',
          property.totalCost || '',
          currentValue,
          property.debtAmount || '',
          property.debtDetails || '',
          property.monthlyRent || '',
          property.capRate || '',
          property.occupancyRate || '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ])
      }
    })

    // Convert to CSV string
    const csvContent = csvRows.map(row => 
      row.map(field => {
        // Escape fields that contain commas, quotes, or newlines
        if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
          return `"${field.replace(/"/g, '""')}"`
        }
        return field
      }).join(',')
    ).join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="investments-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Error exporting CSV:', error)
    return NextResponse.json(
      { error: 'Failed to export CSV', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
