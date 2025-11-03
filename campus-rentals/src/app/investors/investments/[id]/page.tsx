'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeftIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DocumentIcon,
  PlusIcon,
  XMarkIcon,
  ChartBarIcon,
  UserIcon,
  HomeIcon,
  BanknotesIcon,
  PencilIcon,
  TrashIcon,
  CalculatorIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import PropertyLoansManager from '@/components/PropertyLoansManager'

interface Investment {
  id: string
  propertyName?: string
  propertyAddress: string
  investmentAmount: number
  ownershipPercentage: number
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED'
  investmentDate: string
  investorName?: string
  investorEmail?: string
  investmentType?: 'DIRECT' | 'ENTITY'
  entityName?: string
  entityType?: string
  entityOwners?: Array<{
    id: string
    userId: string
    userName: string
    userEmail: string
    ownershipPercentage: number
    investmentAmount: number
  }>
  property: {
    id: string
    name: string
    address: string
    description: string
    bedrooms: number
    bathrooms: number
    price: number
    squareFeet: number
    propertyType: string
    acquisitionDate: string
    constructionCompletionDate?: string
    stabilizationDate?: string
    acquisitionPrice: number
    constructionCost: number
    totalCost: number
    debtAmount?: number
    debtDetails?: string
    currentValue: number
    occupancyRate: number
    monthlyRent: number
    otherIncome?: number
    annualExpenses: number
    capRate: number
  }
  distributions: Array<{
    id: string
    amount: number
    distributionDate: string
    distributionType: string
    description: string
  }>
}

interface Document {
  id: string
  title: string
  description: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  documentType: string
  uploadedAt: string
  uploadedBy: string
}

export default function InvestmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [investment, setInvestment] = useState<Investment | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Helper function to get auth token
  const getAuthToken = (): string => {
    return sessionStorage.getItem('authToken') || currentUser?.email || ''
  }
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateEntityModal, setShowCreateEntityModal] = useState(false)
  const [showSelectEntityModal, setShowSelectEntityModal] = useState(false)
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    documentType: '',
    file: null as File | null
  })
  const [editData, setEditData] = useState({
    investmentAmount: '',
    ownershipPercentage: '',
    monthlyRent: '',
    capRate: '',
    occupancyRate: '',
    annualExpenses: '',
    currentValue: '',
    debtAmount: '',
    debtDetails: '',
    acquisitionPrice: '',
    constructionCost: '',
    totalCost: '',
    acquisitionDate: '',
    constructionCompletionDate: '',
    stabilizationDate: '',
    investmentDate: '',
    propertyName: '',
    propertyAddress: '',
    description: '',
    bedrooms: '',
    bathrooms: '',
    squareFeet: '',
    propertyType: 'RESIDENTIAL',
    // Refinance fields
    isRefinance: false,
    newLoanAmount: '',
    oldLoanPayoff: '',
    prepaymentPenalty: '',
    originationFee: ''
  })
  const [newEntity, setNewEntity] = useState({
    name: '',
    type: 'LLC',
    address: '',
    taxId: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: ''
  })
  const [showMultiInvestorModal, setShowMultiInvestorModal] = useState(false)
  const [showCreateEntityInModal, setShowCreateEntityInModal] = useState(false)
  // Prompt for contact person if an existing entity lacks one
  const [showUpdateEntityContactModal, setShowUpdateEntityContactModal] = useState(false)
  const [pendingEntityContact, setPendingEntityContact] = useState<{ id: string; name: string; contactPerson: string; contactEmail: string; contactPhone: string } | null>(null)
  const [pendingEntitySelectionIndex, setPendingEntitySelectionIndex] = useState<number | null>(null)
  const [multiInvestorData, setMultiInvestorData] = useState({
    entityId: '',
    propertyId: '',
    totalInvestmentAmount: '',
    entityOwnershipPercentage: '',
    investors: [
      {
        investorType: 'INDIVIDUAL', // 'INDIVIDUAL' or 'ENTITY'
        userId: '',
        entityId: '',
        userEmail: '',
        userName: '',
        entityName: '',
        investmentAmount: '',
        ownershipPercentage: ''
      }
    ]
  })
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [availableEntities, setAvailableEntities] = useState<any[]>([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [showEditEntityModal, setShowEditEntityModal] = useState(false)
  const [editingEntityInvestment, setEditingEntityInvestment] = useState<any>(null)
  const [propertyEntityInvestments, setPropertyEntityInvestments] = useState<any[]>([])
  const [selectedEntityToAdd, setSelectedEntityToAdd] = useState<string>('')


  const [showNOIModal, setShowNOIModal] = useState(false)
  const [showInsuranceModal, setShowInsuranceModal] = useState(false)
  const [showTaxModal, setShowTaxModal] = useState(false)
  const [noiData, setNoiData] = useState({
    monthlyRent: '',
    otherIncome: '',
    annualExpenses: '',
    capRate: '',
    currentValueEstimate: ''
  })
  const [insuranceData, setInsuranceData] = useState({
    provider: '',
    policyNumber: '',
    annualPremium: '',
    coverageAmount: '',
    renewalDate: '',
    notes: ''
  })
  const [taxData, setTaxData] = useState({
    annualPropertyTax: '',
    taxYear: new Date().getFullYear().toString(),
    notes: ''
  })
  const [insuranceHistory, setInsuranceHistory] = useState<any[]>([])
  const [taxHistory, setTaxHistory] = useState<any[]>([])
  const [waterfallStructures, setWaterfallStructures] = useState<any[]>([])
  const [globalWaterfallStructures, setGlobalWaterfallStructures] = useState<any[]>([])
  const [allDistributions, setAllDistributions] = useState<any[]>([])
  const [showWaterfallModal, setShowWaterfallModal] = useState(false)
  const [showCreateWaterfallModal, setShowCreateWaterfallModal] = useState(false)
  const [showCreateGlobalWaterfallModal, setShowCreateGlobalWaterfallModal] = useState(false)
  const [showApplyWaterfallModal, setShowApplyWaterfallModal] = useState(false)
  const [showEditWaterfallModal, setShowEditWaterfallModal] = useState(false)
  const [showEditGlobalWaterfallModal, setShowEditGlobalWaterfallModal] = useState(false)
  const [showEditDistributionModal, setShowEditDistributionModal] = useState(false)
  const [editingDistribution, setEditingDistribution] = useState<any>(null)
  const [editingWaterfallStructure, setEditingWaterfallStructure] = useState<any>(null)
  const [showEditDocumentModal, setShowEditDocumentModal] = useState(false)
  const [editingDocument, setEditingDocument] = useState<any>(null)
  const [editDocumentData, setEditDocumentData] = useState({
    title: '',
    description: '',
    documentType: '',
    visibleToAdmin: true,
    visibleToManager: true,
    visibleToInvestor: true
  })
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)
  const [openOwnerBreakdownId, setOpenOwnerBreakdownId] = useState<string | null>(null)
  const [breakdownData, setBreakdownData] = useState<any>(null)
  const [showAllWaterfallStructures, setShowAllWaterfallStructures] = useState(false)
  const [waterfallData, setWaterfallData] = useState({
    name: '',
    description: '',
    tiers: [
      {
        tierNumber: 1,
        tierName: 'Preferred Return',
        tierType: 'PREFERRED_RETURN',
        priority: 1,
        returnRate: 8 as number | null,
        catchUpPercentage: null as number | null,
        promotePercentage: null as number | null
      }
    ]
  })
  const [distributionData, setDistributionData] = useState({
    waterfallStructureId: '',
    totalAmount: '',
    distributionDate: new Date().toISOString().split('T')[0],
    distributionType: 'RENTAL_INCOME',
    description: '',
    // Refinance fields
    refinanceAmount: '',
    newDebtAmount: '',
    originationFees: '',
    closingFees: '',
    closingFeesItems: [] as { category: string; amount: string }[],
    prepaymentPenalty: ''
  })
  const [applyWaterfallData, setApplyWaterfallData] = useState({
    waterfallStructureId: '',
    entityInvestmentId: ''
  })

  useEffect(() => {
      const user = sessionStorage.getItem('currentUser')
      if (user) {
        const userData = JSON.parse(user)
        setCurrentUser(userData)
        fetchInvestmentDetails()
      } else {
        router.push('/investors/login')
      }
  }, [params.id])


  useEffect(() => {
    if (investment?.property?.id) {
      fetchPropertyEntityInvestments()
      fetchInsuranceHistory()
      fetchTaxHistory()
      fetchWaterfallStructures()
      fetchGlobalWaterfallStructures()
      fetchDistributions()
    }
  }, [investment?.property?.id])


  const fetchInvestmentDetails = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}')
      const token = sessionStorage.getItem('authToken') || user.email
      
      // Fetch investment details
      const response = await fetch(`/api/investors/properties`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const investments = await response.json()
        console.log('Fetched investments:', investments.length, 'total investments')
        
        const investmentData = investments.find((inv: Investment) => inv.id === params.id)
        console.log('Found investment data:', investmentData ? 'Yes' : 'No', 'for ID:', params.id)
        
        if (investmentData) {
          console.log('Setting investment data:', {
            id: investmentData.id,
            investmentAmount: investmentData.investmentAmount,
            ownershipPercentage: investmentData.ownershipPercentage,
            propertyName: investmentData.property?.name,
            propertyAddress: investmentData.property?.address
          })
          setInvestment(investmentData)
          // Populate edit data
          setEditData({
            investmentAmount: investmentData.investmentAmount.toString(),
            ownershipPercentage: investmentData.ownershipPercentage.toString(),
            monthlyRent: investmentData.property.monthlyRent.toString(),
            capRate: investmentData.property.capRate.toString(),
            occupancyRate: investmentData.property.occupancyRate.toString(),
            annualExpenses: investmentData.property.annualExpenses.toString(),
            currentValue: investmentData.property.currentValue.toString(),
            debtAmount: investmentData.property.debtAmount?.toString() || '0',
            debtDetails: investmentData.property.debtDetails || '',
            acquisitionPrice: investmentData.property.acquisitionPrice?.toString() || '0',
            constructionCost: investmentData.property.constructionCost?.toString() || '0',
            totalCost: investmentData.property.totalCost?.toString() || '0',
            acquisitionDate: investmentData.property.acquisitionDate ? new Date(investmentData.property.acquisitionDate).toISOString().split('T')[0] : '',
            constructionCompletionDate: investmentData.property.constructionCompletionDate ? new Date(investmentData.property.constructionCompletionDate).toISOString().split('T')[0] : '',
            stabilizationDate: investmentData.property.stabilizationDate ? new Date(investmentData.property.stabilizationDate).toISOString().split('T')[0] : '',
            investmentDate: new Date(investmentData.investmentDate).toISOString().split('T')[0],
            propertyName: investmentData.property.name,
            propertyAddress: investmentData.property.address,
            description: investmentData.property.description,
            bedrooms: investmentData.property.bedrooms.toString(),
            bathrooms: investmentData.property.bathrooms.toString(),
            squareFeet: investmentData.property.squareFeet.toString(),
            propertyType: investmentData.property.propertyType,
            // Refinance fields - set to defaults for existing investments
            isRefinance: false,
            newLoanAmount: '',
            oldLoanPayoff: '',
            prepaymentPenalty: '',
            originationFee: ''
          })
        } else {
          // Investment not found - it may have been deleted
          alert('Investment not found. It may have been deleted.')
          router.push('/investors/dashboard')
        }
      }

      // Fetch documents for this investment
      const docsResponse = await fetch(`/api/investors/documents?entityType=INVESTMENT&entityId=${params.id}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })
      
      if (docsResponse.ok) {
        const docs = await docsResponse.json()
        setDocuments(docs)
      }
    } catch (error) {
      console.error('Error fetching investment details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDocument.file || !newDocument.title) return

    console.log('Uploading document:', {
      title: newDocument.title,
      description: newDocument.description,
      fileName: newDocument.file?.name,
      fileSize: newDocument.file?.size,
      entityType: 'INVESTMENT',
      entityId: params.id
    })

    try {
      const formData = new FormData()
      formData.append('title', newDocument.title)
      formData.append('description', newDocument.description)
      formData.append('documentType', newDocument.documentType)
      formData.append('file', newDocument.file)
      formData.append('entityType', 'INVESTMENT')
      formData.append('entityId', params.id as string)

      const response = await fetch('/api/investors/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
      })

      console.log('Document upload response status:', response.status)

      if (response.ok) {
        setShowUploadModal(false)
        setNewDocument({ title: '', description: '', documentType: '', file: null })
        await fetchInvestmentDetails() // Refresh documents
        alert('Document uploaded successfully!')
      } else {
        const errorData = await response.json()
        console.error('Document upload failed:', errorData)
        alert(`Failed to upload document: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Error uploading document')
    }
  }

  const handleEditInvestment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const requestBody = {
        // investmentAmount is calculated from entity investments, not editable here
        ownershipPercentage: parseFloat(editData.ownershipPercentage),
        investmentDate: editData.investmentDate ? new Date(editData.investmentDate) : null,
        status: investment?.status || 'ACTIVE',
        monthlyRent: parseFloat(editData.monthlyRent),
        capRate: parseFloat(editData.capRate),
        occupancyRate: parseFloat(editData.occupancyRate),
        annualExpenses: parseFloat(editData.annualExpenses),
        // debtAmount is managed in Property Loans section, not editable here
        debtDetails: editData.debtDetails,
        acquisitionPrice: parseFloat(editData.acquisitionPrice),
        constructionCost: parseFloat(editData.constructionCost),
        totalCost: parseFloat(editData.totalCost),
        acquisitionDate: editData.acquisitionDate ? new Date(editData.acquisitionDate) : null,
        constructionCompletionDate: editData.constructionCompletionDate ? new Date(editData.constructionCompletionDate) : null,
        stabilizationDate: editData.stabilizationDate ? new Date(editData.stabilizationDate) : null,
        propertyName: editData.propertyName,
        propertyAddress: editData.propertyAddress,
        description: editData.description,
        bedrooms: parseInt(editData.bedrooms),
        bathrooms: parseInt(editData.bathrooms),
        squareFeet: parseInt(editData.squareFeet),
        propertyType: editData.propertyType
      }
      
      // Determine if this is a regular investment or entity investment
      const isEntityInvestment = investment?.entityName || investment?.entityType
      const apiEndpoint = isEntityInvestment 
        ? `/api/investors/entity-investments/${params.id}`
        : `/api/investors/investments/${params.id}`
      
      console.log('Using API endpoint:', apiEndpoint, 'Is entity investment:', isEntityInvestment)
      
      // Update investment and property
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Edit Investment Response Status:', response.status)
      console.log('Edit Investment Response OK:', response.ok)

      if (response.ok) {
        console.log('Investment update successful, refreshing data...')
        setShowEditModal(false)
        
        // Refresh cache first
        try {
          const cacheResponse = await fetch('/api/cache', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ action: 'refresh' })
          })
          console.log('Cache refresh response:', cacheResponse.status)
        } catch (cacheError) {
          console.error('Cache refresh failed:', cacheError)
        }
        
        // Then refresh investment details
        await fetchInvestmentDetails()
        alert('Investment updated successfully!')
      } else {
        const errorData = await response.json()
        console.error('Edit Investment API Error:', errorData)
        alert(`Failed to update investment: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating investment:', error)
      alert('Error updating investment')
    }
  }

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!newEntity.contactPerson || newEntity.contactPerson.trim() === '') {
      alert('Contact Person is required.')
      return
    }
    
    try {
      const response = await fetch('/api/investors/entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(newEntity)
      })

      if (response.ok) {
        const createdEntity = await response.json()
        setShowCreateEntityModal(false)
        setNewEntity({
          name: '',
          type: 'LLC',
          address: '',
          taxId: '',
          contactPerson: '',
          contactEmail: '',
          contactPhone: ''
        })
        await fetchAvailableEntities() // Refresh entities list
        
        // Automatically add the newly created entity to the property
        if (investment?.property?.id && createdEntity.id) {
          await handleAddExistingEntityToProperty(createdEntity.id)
        } else {
          alert('Entity created successfully! You can now add it to this project from the entity list.')
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to create entity')
      }
    } catch (error) {
      console.error('Error creating entity:', error)
      alert('Error creating entity. Please try again.')
    }
  }

  const handleAddExistingEntityToProperty = async (entityId: string) => {
    try {
      if (!investment?.property?.id) {
        alert('Property information is missing')
        return
      }

      // Create entity investment with default values
      const response = await fetch('/api/investors/entity-investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          entityId: entityId,
          propertyId: investment.property.id,
          investmentAmount: 0,
          ownershipPercentage: 0,
          status: 'ACTIVE',
          owners: [] // Empty array - owners will be added later through the edit modal
        })
      })

      if (response.ok) {
        setShowSelectEntityModal(false)
        await fetchPropertyEntityInvestments()
        alert('Entity added to property successfully!')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to add entity to property')
      }
    } catch (error) {
      console.error('Error adding entity to property:', error)
      alert('Error adding entity to property. Please try again.')
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/investors/users', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })
      if (response.ok) {
        const users = await response.json()
        setAvailableUsers(users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchAvailableEntities = async () => {
    try {
      setLoadingEntities(true)
      console.log('Fetching available entities...')
      const response = await fetch('/api/investors/entities', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })
      if (response.ok) {
        const entities = await response.json()
        console.log('Fetched entities:', entities)
        setAvailableEntities(entities)
      } else {
        console.error('Failed to fetch entities:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching entities:', error)
    } finally {
      setLoadingEntities(false)
    }
  }

  const fetchPropertyEntityInvestments = async () => {
    try {
      if (!investment?.property?.id) return
      
      const response = await fetch('/api/investors/entity-investments', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })
      if (response.ok) {
        const entityInvestments = await response.json()
        console.log('All entity investments:', entityInvestments)
        // Filter for this property
        const propertyEntities = entityInvestments.filter((ei: any) => ei.propertyId === investment.property.id)
        console.log('Property entity investments:', propertyEntities)
        setPropertyEntityInvestments(propertyEntities)
      }
    } catch (error) {
      console.error('Error fetching property entity investments:', error)
    }
  }



  const addInvestor = () => {
    setMultiInvestorData(prev => ({
      ...prev,
      investors: [
        ...prev.investors,
        {
          investorType: 'INDIVIDUAL',
          userId: '',
          entityId: '',
          userEmail: '',
          userName: '',
          entityName: '',
          investmentAmount: '',
          ownershipPercentage: ''
        }
      ]
    }))
  }

  const removeInvestor = (index: number) => {
    setMultiInvestorData(prev => ({
      ...prev,
      investors: prev.investors.filter((_, i) => i !== index)
    }))
  }

  const updateInvestor = (index: number, field: string, value: string) => {
    setMultiInvestorData(prev => ({
      ...prev,
      investors: prev.investors.map((investor, i) => 
        i === index ? { ...investor, [field]: value } : investor
      )
    }))
  }

  const handleCreateMultiInvestorInvestment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Validate total ownership percentage equals 100%
      const totalOwnership = multiInvestorData.investors.reduce(
        (sum, investor) => sum + parseFloat(investor.ownershipPercentage || '0'), 0
      )
      
      if (Math.abs(totalOwnership - 100) > 0.01) {
        alert('Total ownership percentage must equal 100%')
        return
      }

      // Validate individual amounts
      const totalEntityAmount = parseFloat(multiInvestorData.totalInvestmentAmount || '0')
      const totalInvestorAmounts = multiInvestorData.investors.reduce(
        (sum, investor) => sum + parseFloat(investor.investmentAmount || '0'), 0
      )

      if (totalInvestorAmounts > totalEntityAmount) {
        alert('Total investor amounts cannot exceed the entity investment amount')
        return
      }

      // Check for negative amounts
      const hasNegativeAmounts = multiInvestorData.investors.some(investor => 
        parseFloat(investor.investmentAmount || '0') < 0
      )

      if (hasNegativeAmounts) {
        alert('Investment amounts cannot be negative')
        return
      }

      const response = await fetch('/api/investors/entity-investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          entityId: multiInvestorData.entityId,
          propertyId: multiInvestorData.propertyId,
          investmentAmount: parseFloat(multiInvestorData.totalInvestmentAmount),
          ownershipPercentage: parseFloat(multiInvestorData.entityOwnershipPercentage),
          owners: multiInvestorData.investors.map(investor => ({
            userId: investor.userId,
            ownershipPercentage: parseFloat(investor.ownershipPercentage),
            investmentAmount: parseFloat(investor.investmentAmount)
          }))
        })
      })

      if (response.ok) {
        setShowMultiInvestorModal(false)
        setMultiInvestorData({
          entityId: '',
          propertyId: '',
          totalInvestmentAmount: '',
          entityOwnershipPercentage: '',
          investors: [
            {
              investorType: 'INDIVIDUAL',
              userId: '',
              entityId: '',
              userEmail: '',
              userName: '',
              entityName: '',
              investmentAmount: '',
              ownershipPercentage: ''
            }
          ]
        })
        // Refresh investment details and property entity investments
        await Promise.all([
          fetchInvestmentDetails(),
          fetchPropertyEntityInvestments()
        ])
        alert('Multi-investor investment created successfully!')
      } else {
        alert('Failed to create multi-investor investment')
      }
    } catch (error) {
      console.error('Error creating multi-investor investment:', error)
    }
  }
  const handleCreateEntityInModal = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!newEntity.contactPerson || newEntity.contactPerson.trim() === '') {
      alert('Contact Person is required.')
      return
    }
    
    try {
      const response = await fetch('/api/investors/entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(newEntity)
      })

      if (response.ok) {
        const createdEntity = await response.json()
        // Update the entity selection with the newly created entity
        setMultiInvestorData(prev => ({ ...prev, entityId: createdEntity.id }))
        // Refresh available entities
        await fetchAvailableEntities()
        // Close the create entity modal
        setShowCreateEntityInModal(false)
        // Reset the new entity form
        setNewEntity({
          name: '',
          type: 'LLC',
          address: '',
          taxId: '',
          contactPerson: '',
          contactEmail: '',
          contactPhone: ''
        })
        alert('Entity created successfully!')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to create entity')
      }
    } catch (error) {
      console.error('Error creating entity:', error)
      alert('Error creating entity. Please try again.')
    }
  }

  const handleEditEntity = async (entityInvestment: any) => {
    console.log('Editing entity investment:', entityInvestment)
    console.log('Entity owners:', entityInvestment.entity?.entityOwners)
    
    // Fetch available users for the dropdown
    if (availableUsers.length === 0) {
      await fetchAvailableUsers()
    }
    // Ensure existing entities are loaded for selection
    if (availableEntities.length === 0) {
      await fetchAvailableEntities()
    }
    
    // Determine owners: prefer per-deal owners, else fallback to global entity owners
    const ownersFromApi = (entityInvestment.entityInvestmentOwners && entityInvestment.entityInvestmentOwners.length > 0)
      ? entityInvestment.entityInvestmentOwners
      : (entityInvestment.entity?.entityOwners || [])

    // Map breakdown data from database to owners
    const entityInvestmentWithBreakdown = {
      ...entityInvestment,
      entity: {
        ...entityInvestment.entity,
        entityOwners: ownersFromApi.map((owner: any) => ({
          ...owner,
          breakdown: owner.breakdown ? (Array.isArray(owner.breakdown) ? owner.breakdown : []) : null,
          showBreakdown: Array.isArray(owner.breakdown) && owner.breakdown.length > 0
        })) || []
      }
    }
    
    setEditingEntityInvestment(entityInvestmentWithBreakdown)
    setShowEditEntityModal(true)
  }
  const handleDeleteEntity = async (entityInvestmentId: string) => {
    if (!confirm('Are you sure you want to delete this entity investment? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/investors/entity-investments/${entityInvestmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      if (response.ok) {
        // Refresh all data to show updated state
        await Promise.all([
          fetchPropertyEntityInvestments(),
          fetchInvestmentDetails()
        ])
        
        // Show success message
        alert('Entity investment deleted successfully!')
        
        // If this was the last entity and the current investment is an entity investment,
        // check if we need to redirect to dashboard
        const updatedEntityInvestments = await fetch('/api/investors/entity-investments', {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }).then(res => res.json())
        
        const propertyEntities = updatedEntityInvestments.filter((ei: any) => ei.propertyId === investment?.property?.id)
        if (propertyEntities.length === 0 && investment?.investmentType === 'ENTITY') {
          alert('All entities for this property have been deleted. Redirecting to dashboard.')
          router.push('/investors/dashboard')
        }
      } else {
        console.error('Failed to delete entity investment')
        alert('Failed to delete entity investment. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting entity investment:', error)
      alert('Error deleting entity investment. Please try again.')
    }
  }

  const addEntityInvestor = async () => {
    if (!editingEntityInvestment) return
    
    // Fetch available users if not already loaded
    if (availableUsers.length === 0) {
      await fetchAvailableUsers()
    }
    
    const newOwner = {
      id: `temp-${Date.now()}`,
      userId: '',
      user: { firstName: '', lastName: '', email: '' },
      ownershipPercentage: 0,
      investmentAmount: 0
    }
    
    setEditingEntityInvestment({
      ...editingEntityInvestment,
      entity: {
        ...editingEntityInvestment.entity,
        entityOwners: [...(editingEntityInvestment.entity.entityOwners || []), newOwner]
      }
    })
  }

  const removeEntityInvestor = (index: number) => {
    if (!editingEntityInvestment) return
    
    const updatedOwners = editingEntityInvestment.entity.entityOwners.filter((_: any, i: number) => i !== index)
    setEditingEntityInvestment({
      ...editingEntityInvestment,
      entity: {
        ...editingEntityInvestment.entity,
        entityOwners: updatedOwners
      }
    })
  }

  const updateEntityInvestor = (index: number, field: string, value: any) => {
    if (!editingEntityInvestment) return
    
    const updatedOwners = [...editingEntityInvestment.entity.entityOwners]
    if (field === 'user') {
      updatedOwners[index] = { ...updatedOwners[index], user: { ...updatedOwners[index].user, ...value } }
    } else {
      updatedOwners[index] = { ...updatedOwners[index], [field]: value }
    }
    
    setEditingEntityInvestment({
      ...editingEntityInvestment,
      entity: {
        ...editingEntityInvestment.entity,
        entityOwners: updatedOwners
      }
    })
  }

  const handleUpdateEntityInvestment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingEntityInvestment) return

    try {
      // Validate that each entity owner has proper user information
      const invalidOwners = editingEntityInvestment.entity.entityOwners.filter((owner: any) => {
        // Must have either a userId, an investorEntityId, or complete user info
        const hasUserId = owner.userId && owner.userId.trim() !== ''
        const hasInvestorEntity = owner.investorEntityId && String(owner.investorEntityId).trim() !== ''
        const hasCompleteUserInfo = owner.user && 
          owner.user.firstName && owner.user.firstName.trim() !== '' &&
          owner.user.lastName && owner.user.lastName.trim() !== '' &&
          owner.user.email && owner.user.email.trim() !== ''
        
        const isValid = hasUserId || hasInvestorEntity || hasCompleteUserInfo
        
        return !isValid
      })

      if (invalidOwners.length > 0) {
        console.log('Invalid owners:', invalidOwners)
        alert('Please ensure all investors have either been selected from the list or have complete information filled in.')
        return
      }

      // Validate ownership percentages
      const totalOwnership = editingEntityInvestment.entity.entityOwners.reduce((sum: number, owner: any) => {
        return sum + parseFloat(owner.ownershipPercentage || 0)
      }, 0)

      if (totalOwnership > 100) {
        alert('Total ownership percentage cannot exceed 100%')
        return
      }

      // Validate individual amounts
      const totalEntityAmount = parseFloat(editingEntityInvestment.investmentAmount || 0)
      const totalInvestorAmounts = editingEntityInvestment.entity.entityOwners.reduce((sum: number, owner: any) => {
        return sum + parseFloat(owner.investmentAmount || 0)
      }, 0)

      if (totalInvestorAmounts > totalEntityAmount) {
        alert('Total investor amounts cannot exceed the entity investment amount')
        return
      }

      // Check for negative amounts
      const hasNegativeAmounts = editingEntityInvestment.entity.entityOwners.some((owner: any) => {
        return parseFloat(owner.investmentAmount || 0) < 0
      })

      if (hasNegativeAmounts) {
        alert('Investment amounts cannot be negative')
        return
      }

      const requestBody = {
        investmentAmount: parseFloat(editingEntityInvestment.investmentAmount),
        ownershipPercentage: parseFloat(editingEntityInvestment.ownershipPercentage),
        entityOwners: editingEntityInvestment.entity.entityOwners.map((owner: any) => ({
          ...owner,
          ownershipPercentage: parseFloat(owner.ownershipPercentage) || 0,
          investmentAmount: parseFloat(owner.investmentAmount) || 0,
          breakdown: owner.breakdown || null
        }))
      }

      // Verbose client-side logging to inspect what will be saved
      try {
        const ownersSummary = requestBody.entityOwners.map((o: any) => ({
          userId: o.userId || null,
          investorEntityId: o.investorEntityId || null,
          ownershipPercentage: o.ownershipPercentage,
          investmentAmount: o.investmentAmount,
          breakdownCount: Array.isArray(o.breakdown) ? o.breakdown.length : 0,
          breakdownTotal: Array.isArray(o.breakdown) ? o.breakdown.reduce((s: number, r: any) => s + (parseFloat(r.amount || 0)), 0) : 0
        }))
        console.log('[Save] EntityInvestment PUT request body summary:', {
          investmentAmount: requestBody.investmentAmount,
          ownershipPercentage: requestBody.ownershipPercentage,
          owners: ownersSummary
        })
        // Also log the raw body in a safe way (truncated)
        console.log('[Save] Raw owners payload (truncated):', JSON.stringify(requestBody.entityOwners).slice(0, 2000))
      } catch (logErr) {
        console.warn('Failed to log request body summary:', logErr)
      }

      const response = await fetch(`/api/investors/entity-investments/${editingEntityInvestment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Entity investment update response status:', response.status)
      try {
        const clone = response.clone()
        const text = await clone.text()
        console.log('[Save] Response text (truncated):', text.slice(0, 2000))
      } catch {}

      if (response.ok) {
        setShowEditEntityModal(false)
        setEditingEntityInvestment(null)
        await fetchPropertyEntityInvestments()
        alert('Entity investment updated successfully!')
      } else {
        const errorData = await response.json()
        console.error('Failed to update entity investment:', errorData)
        alert(`Failed to update entity investment: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating entity investment:', error)
      alert('Error updating entity investment')
    }
  }

  // Get the current NOI calculation (same as displayed in NOI Calculator)
  const getCurrentNOICalculation = () => {
    const monthlyRent = investment?.property?.monthlyRent || 0
    const otherIncome = investment?.property?.otherIncome || 0
    const annualExpenses = investment?.property?.annualExpenses || 0
    const capRate = investment?.property?.capRate || 0

    const annualRent = monthlyRent * 12
    const annualOtherIncome = otherIncome * 12
    const annualRevenue = annualRent + annualOtherIncome
    const noi = annualRevenue - annualExpenses
    const estimatedValue = capRate > 0 ? (noi / (capRate / 100)) : 0

    return estimatedValue
  }

  // NOI Calculation Functions
  const calculateNOI = () => {
    const monthlyRent = parseFloat(noiData.monthlyRent || '0')
    const otherIncome = parseFloat(noiData.otherIncome || '0')
    const annualExpenses = parseFloat(noiData.annualExpenses || '0')
    const capRate = parseFloat(noiData.capRate || '0')

    const annualRent = monthlyRent * 12
    const annualOtherIncome = otherIncome * 12
    const annualRevenue = annualRent + annualOtherIncome
    const noi = annualRevenue - annualExpenses
    const estimatedValue = capRate > 0 ? (noi / (capRate / 100)) : 0

    return {
      annualRent,
      annualOtherIncome,
      annualRevenue,
      annualExpenses,
      noi,
      estimatedValue
    }
  }

  const handleNOICalculation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const calculations = calculateNOI()
    
    try {
      const requestBody = {
        // Investment fields
        investmentAmount: parseFloat(editData.investmentAmount),
        ownershipPercentage: parseFloat(editData.ownershipPercentage),
        status: investment?.status || 'ACTIVE',
        // Property fields
        propertyName: editData.propertyName,
        propertyAddress: editData.propertyAddress,
        description: editData.description,
        bedrooms: parseInt(editData.bedrooms),
        bathrooms: parseInt(editData.bathrooms),
        squareFeet: parseInt(editData.squareFeet),
        propertyType: editData.propertyType,
        acquisitionPrice: parseFloat(editData.acquisitionPrice),
        constructionCost: parseFloat(editData.constructionCost),
        totalCost: parseFloat(editData.totalCost),
        acquisitionDate: editData.acquisitionDate,
        constructionCompletionDate: editData.constructionCompletionDate,
        stabilizationDate: editData.stabilizationDate,

        occupancyRate: parseFloat(editData.occupancyRate || '0'),
        monthlyRent: parseFloat(noiData.monthlyRent),
        otherIncome: parseFloat(noiData.otherIncome || '0'),
        annualExpenses: parseFloat(noiData.annualExpenses),
        capRate: parseFloat(noiData.capRate),
        // Debt fields
        debtAmount: parseFloat(editData.debtAmount || '0'),
        debtDetails: editData.debtDetails
      }
      
      console.log('Request body:', requestBody)
      console.log('Other income in request:', requestBody.otherIncome, 'Type:', typeof requestBody.otherIncome)
      
      // For NOI calculations, we always update the property, not the investment
      const apiEndpoint = `/api/investors/properties/${investment?.property?.id}`
      
      console.log('NOI Calculation using property API endpoint:', apiEndpoint, 'Property ID:', investment?.property?.id)
      console.log('Investment property details:', {
        propertyId: investment?.property?.id,
        propertyName: investment?.property?.name,
        propertyAddress: investment?.property?.address,
        currentOtherIncome: investment?.property?.otherIncome
      })
      
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (response.ok) {
        console.log('NOI calculation update successful, refreshing data...')
        setShowNOIModal(false)
        
        // Refresh cache first
        try {
          const cacheResponse = await fetch('/api/cache', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ action: 'refresh' })
          })
          console.log('Cache refresh response:', cacheResponse.status)
        } catch (cacheError) {
          console.error('Cache refresh failed:', cacheError)
        }
        
        // Then refresh investment details
        await fetchInvestmentDetails()
        alert('NOI calculations updated successfully!')
      } else {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        console.error('Response status:', response.status)
        console.error('Response headers:', Object.fromEntries(response.headers.entries()))
        alert(`Failed to update NOI calculations: ${errorData.error || 'Unknown error'}\n\nDetails: ${errorData.details || 'No additional details'}`)
      }
    } catch (error) {
      console.error('Error updating NOI calculations:', error)
      alert('Error updating NOI calculations')
    }
  }

  const handleAddInsurance = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/investors/insurance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          propertyId: investment?.property?.id,
          ...insuranceData
        })
      })

      if (response.ok) {
        setShowInsuranceModal(false)
        setInsuranceData({
          provider: '',
          policyNumber: '',
          annualPremium: '',
          coverageAmount: '',
          renewalDate: '',
          notes: ''
        })
        await fetchInsuranceHistory()
        alert('Insurance information added successfully!')
      } else {
        alert('Failed to add insurance information')
      }
    } catch (error) {
      console.error('Error adding insurance:', error)
      alert('Error adding insurance information')
    }
  }

  const handleAddTax = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/investors/taxes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          propertyId: investment?.property?.id,
          ...taxData
        })
      })

      if (response.ok) {
        setShowTaxModal(false)
        setTaxData({
          annualPropertyTax: '',
          taxYear: new Date().getFullYear().toString(),
          notes: ''
        })
        await fetchTaxHistory()
        alert('Tax information added successfully!')
      } else {
        alert('Failed to add tax information')
      }
    } catch (error) {
      console.error('Error adding tax:', error)
      alert('Error adding tax information')
    }
  }

  const fetchInsuranceHistory = async () => {
    try {
      const response = await fetch(`/api/investors/insurance?propertyId=${investment?.property?.id}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setInsuranceHistory(data)
      }
    } catch (error) {
      console.error('Error fetching insurance history:', error)
    }
  }

  const fetchTaxHistory = async () => {
    try {
      const response = await fetch(`/api/investors/taxes?propertyId=${investment?.property?.id}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTaxHistory(data)
      }
    } catch (error) {
      console.error('Error fetching tax history:', error)
    }
  }

  const fetchWaterfallStructures = async () => {
    try {
      const response = await fetch(`/api/investors/waterfall-structures?propertyId=${investment?.property?.id}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })
      if (response.ok) {
        const structures = await response.json()
        setWaterfallStructures(structures)
      }
    } catch (error) {
      console.error('Error fetching waterfall structures:', error)
    }
  }

  const fetchGlobalWaterfallStructures = async () => {
    try {
      const response = await fetch('/api/investors/global-waterfall-structures', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })
      if (response.ok) {
        const structures = await response.json()
        setGlobalWaterfallStructures(structures)
      }
    } catch (error) {
      console.error('Error fetching global waterfall structures:', error)
    }
  }

  const fetchDistributions = async () => {
    if (!investment?.property?.id) {
      return
    }
    
    try {
      // Fetch distributions filtered by property ID
      const allResponse = await fetch(`/api/investors/waterfall-distributions/all?propertyId=${investment.property.id}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })
      
      if (allResponse.ok) {
        const allData = await allResponse.json()
        
        // Filter distributions to only show those for this property
        const propertyDistributions = allData.filter((dist: any) => {
          // Check if distribution's waterfall structure belongs to this property
          return dist.waterfallStructure?.propertyId === investment.property.id
        })
        
        setAllDistributions(propertyDistributions)
        
        // Update waterfall structures with their distributions (for the waterfall section)
        setWaterfallStructures(prev => prev.map(structure => ({
          ...structure,
          waterfallDistributions: propertyDistributions.filter((dist: any) => dist.waterfallStructureId === structure.id)
        })))
      }
    } catch (error) {
      console.error('Error fetching distributions:', error)
    }
  }

  const handleCreateWaterfallStructure = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/investors/waterfall-structures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          propertyId: investment?.property?.id,
          name: waterfallData.name,
          description: waterfallData.description,
          tiers: waterfallData.tiers
        })
      })

      if (response.ok) {
        setShowCreateWaterfallModal(false)
        setWaterfallData({
          name: '',
          description: '',
                  tiers: [
          {
            tierNumber: 1,
            tierName: 'Preferred Return',
            tierType: 'PREFERRED_RETURN',
            priority: 1,
            returnRate: 8 as number | null,
            catchUpPercentage: null as number | null,
            promotePercentage: null as number | null
          }
        ]
        })
        await fetchWaterfallStructures()
        alert('Waterfall structure created successfully!')
      } else {
        alert('Failed to create waterfall structure')
      }
    } catch (error) {
      console.error('Error creating waterfall structure:', error)
    }
  }

  const handleCreateGlobalWaterfallStructure = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/investors/global-waterfall-structures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          name: waterfallData.name,
          description: waterfallData.description,
          tiers: waterfallData.tiers
        })
      })

      if (response.ok) {
        setShowCreateGlobalWaterfallModal(false)
        setWaterfallData({
          name: '',
          description: '',
          tiers: [
            {
              tierNumber: 1,
              tierName: 'Preferred Return',
              tierType: 'PREFERRED_RETURN',
              priority: 1,
              returnRate: 8 as number | null,
              catchUpPercentage: null as number | null,
              promotePercentage: null as number | null
            }
          ]
        })
        await fetchGlobalWaterfallStructures()
        alert('Global waterfall structure created successfully!')
      } else {
        alert('Failed to create global waterfall structure')
      }
    } catch (error) {
      console.error('Error creating global waterfall structure:', error)
    }
  }

  const handleApplyWaterfallStructure = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/investors/apply-waterfall-structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          waterfallStructureId: applyWaterfallData.waterfallStructureId,
          entityInvestmentId: applyWaterfallData.entityInvestmentId
        })
      })

      if (response.ok) {
        setShowApplyWaterfallModal(false)
        setApplyWaterfallData({
          waterfallStructureId: '',
          entityInvestmentId: ''
        })
        await fetchWaterfallStructures()
        alert('Waterfall structure applied successfully!')
      } else {
        alert('Failed to apply waterfall structure')
      }
    } catch (error) {
      console.error('Error applying waterfall structure:', error)
    }
  }

  const handleEditWaterfallStructure = (structure: any) => {
    console.log('handleEditWaterfallStructure called with structure:', structure)
    setEditingWaterfallStructure(structure)
    setWaterfallData({
      name: structure.name,
      description: structure.description,
      tiers: structure.waterfallTiers.map((tier: any) => ({
        tierNumber: tier.tierNumber,
        tierName: tier.tierName,
        tierType: tier.tierType,
        priority: tier.priority,
        returnRate: tier.returnRate,
        catchUpPercentage: tier.catchUpPercentage,
        promotePercentage: tier.promotePercentage
      }))
    })
    setShowEditWaterfallModal(true)
    console.log('Edit waterfall modal should now be open')
  }

  const handleEditGlobalWaterfallStructure = (structure: any) => {
    setEditingWaterfallStructure(structure)
    setWaterfallData({
      name: structure.name,
      description: structure.description,
      tiers: structure.waterfallTiers.map((tier: any) => ({
        tierNumber: tier.tierNumber,
        tierName: tier.tierName,
        tierType: tier.tierType,
        priority: tier.priority,
        returnRate: tier.returnRate,
        catchUpPercentage: tier.catchUpPercentage,
        promotePercentage: tier.promotePercentage
      }))
    })
    setShowEditGlobalWaterfallModal(true)
  }

  const handleUpdateWaterfallStructure = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`/api/investors/waterfall-structures/${editingWaterfallStructure.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          name: waterfallData.name,
          description: waterfallData.description,
          tiers: waterfallData.tiers
        })
      })

      if (response.ok) {
        setShowEditWaterfallModal(false)
        setEditingWaterfallStructure(null)
        setWaterfallData({
          name: '',
          description: '',
          tiers: [
            {
              tierNumber: 1,
              tierName: 'Preferred Return',
              tierType: 'PREFERRED_RETURN',
              priority: 1,
              returnRate: 8 as number | null,
              catchUpPercentage: null as number | null,
              promotePercentage: null as number | null
            }
          ]
        })
        await fetchWaterfallStructures()
        alert('Waterfall structure updated successfully!')
      } else {
        alert('Failed to update waterfall structure')
      }
    } catch (error) {
      console.error('Error updating waterfall structure:', error)
    }
  }
  const handleUpdateGlobalWaterfallStructure = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`/api/investors/global-waterfall-structures/${editingWaterfallStructure.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          name: waterfallData.name,
          description: waterfallData.description,
          tiers: waterfallData.tiers
        })
      })

      if (response.ok) {
        setShowEditGlobalWaterfallModal(false)
        setEditingWaterfallStructure(null)
        setWaterfallData({
          name: '',
          description: '',
          tiers: [
            {
              tierNumber: 1,
              tierName: 'Preferred Return',
              tierType: 'PREFERRED_RETURN',
              priority: 1,
              returnRate: 8 as number | null,
              catchUpPercentage: null as number | null,
              promotePercentage: null as number | null
            }
          ]
        })
        await fetchGlobalWaterfallStructures()
        alert('Global waterfall structure updated successfully!')
      } else {
        alert('Failed to update global waterfall structure')
      }
    } catch (error) {
      console.error('Error updating global waterfall structure:', error)
    }
  }

  const handleEditDistribution = (distribution: any) => {
    setEditingDistribution(distribution)
    setDistributionData({
      waterfallStructureId: distribution.waterfallStructureId,
      totalAmount: distribution.totalAmount.toString(),
      distributionDate: new Date(distribution.distributionDate).toISOString().split('T')[0],
      distributionType: distribution.distributionType,
      description: distribution.description || '',
      refinanceAmount: '',
      newDebtAmount: '',
      originationFees: '',
      closingFees: '',
      closingFeesItems: [],
      prepaymentPenalty: ''
    })
    setShowEditDistributionModal(true)
  }
  const handleUpdateDistribution = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/investors/waterfall-distributions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          distributionId: editingDistribution.id,
          totalAmount: distributionData.totalAmount,
          distributionDate: distributionData.distributionDate,
          distributionType: distributionData.distributionType,
          description: distributionData.description
        })
      })

      if (response.ok) {
        setShowEditDistributionModal(false)
        setEditingDistribution(null)
        setDistributionData({
          waterfallStructureId: '',
          totalAmount: '',
          distributionDate: new Date().toISOString().split('T')[0],
          distributionType: 'RENTAL_INCOME',
          description: '',
          refinanceAmount: '',
          newDebtAmount: '',
          originationFees: '',
          closingFees: '',
          closingFeesItems: [],
          prepaymentPenalty: ''
        })
        await fetchWaterfallStructures()
        alert('Distribution updated successfully!')
      } else {
        alert('Failed to update distribution')
      }
    } catch (error) {
      console.error('Error updating distribution:', error)
    }
  }

  const handleDeleteDistribution = async (distributionId: string) => {
    if (!confirm('Are you sure you want to delete this distribution? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/investors/waterfall-distributions?id=${distributionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      if (response.ok) {
        console.log('Distribution deleted successfully')
        await fetchDistributions()
        alert('Distribution deleted successfully!')
      } else {
        const errorData = await response.json()
        console.error('Failed to delete distribution:', errorData)
        alert('Failed to delete distribution')
      }
    } catch (error) {
      console.error('Error deleting distribution:', error)
    }
  }

  const handleDeleteWaterfallStructure = async (structureId: string) => {
    if (!confirm('Are you sure you want to delete this waterfall structure? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/investors/waterfall-structures/${structureId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      if (response.ok) {
        console.log('Waterfall structure deleted successfully')
        await fetchWaterfallStructures()
        alert('Waterfall structure deleted successfully!')
      } else {
        const errorData = await response.json()
        console.error('Failed to delete waterfall structure:', errorData)
        alert('Failed to delete waterfall structure')
      }
    } catch (error) {
      console.error('Error deleting waterfall structure:', error)
    }
  }

  const handleEditDocument = (document: any) => {
    setEditingDocument(document)
    setEditDocumentData({
      title: document.title,
      description: document.description,
      documentType: document.documentType,
      visibleToAdmin: document.visibleToAdmin !== undefined ? document.visibleToAdmin : true,
      visibleToManager: document.visibleToManager !== undefined ? document.visibleToManager : true,
      visibleToInvestor: document.visibleToInvestor !== undefined ? document.visibleToInvestor : true
    })
    setShowEditDocumentModal(true)
  }

  const handleUpdateDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`/api/documents/${editingDocument.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(editDocumentData)
      })

      if (response.ok) {
        console.log('Document updated successfully')
        setShowEditDocumentModal(false)
        await fetchInvestmentDetails()
        alert('Document updated successfully!')
      } else {
        const errorData = await response.json()
        console.error('Update document error:', errorData)
        alert(`Failed to update document: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating document:', error)
      alert('Error updating document')
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      if (response.ok) {
        console.log('Document deleted successfully')
        await fetchInvestmentDetails()
        alert('Document deleted successfully!')
      } else {
        const errorData = await response.json()
        console.error('Delete document error:', errorData)
        alert(`Failed to delete document: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Error deleting document')
    }
  }

  const handleProcessDistribution = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if this is a global waterfall structure by checking if it's in the global structures array
    const isGlobalStructure = globalWaterfallStructures.some(s => s.id === distributionData.waterfallStructureId)
    
    const requestBody = {
      waterfallStructureId: distributionData.waterfallStructureId,
      totalAmount: parseFloat(distributionData.totalAmount),
      distributionDate: distributionData.distributionDate,
      distributionType: distributionData.distributionType,
      description: distributionData.description,
      // If it's a global structure, include propertyId so the API knows to create a local copy
      ...(isGlobalStructure && { propertyId: investment?.property?.id }),
      // Include refinancing data if this is a refinance distribution
      ...(distributionData.distributionType === 'REFINANCE' && {
        newDebtAmount: distributionData.newDebtAmount,
        originationFees: distributionData.originationFees,
        prepaymentPenalty: distributionData.prepaymentPenalty,
        closingFeesItems: (distributionData.closingFeesItems || []).map((i: any) => ({
          category: i.category,
          amount: parseFloat(i.amount || '0') || 0
        }))
      })
    }
    
    
    try {
      const response = await fetch('/api/investors/waterfall-distributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const result = await response.json()
        
        // Create detailed breakdown message
        let breakdownMessage = `🎉 Distribution processed successfully!\n\n`
        
        if (distributionData.distributionType === 'REFINANCE') {
          breakdownMessage += `🏠 Refinance Summary:\n`
          breakdownMessage += `• New Debt Amount: ${formatCurrency(parseFloat(distributionData.newDebtAmount || '0'))}\n`
          breakdownMessage += `• Origination Fees: ${formatCurrency(parseFloat(distributionData.originationFees || '0'))}\n`
          breakdownMessage += `• Closing Fees: ${formatCurrency(parseFloat(distributionData.closingFees || '0'))}\n`
          breakdownMessage += `• Prepayment Penalty: ${formatCurrency(parseFloat(distributionData.prepaymentPenalty || '0'))}\n`
          breakdownMessage += `• Distribution Amount: ${formatCurrency(parseFloat(distributionData.totalAmount || '0'))}\n\n`
        }
        
        // Property debt is now updated automatically by the API for refinancing distributions
        if (distributionData.distributionType === 'REFINANCE') {
          const newDebtAmount = parseFloat(distributionData.newDebtAmount) || 0
          breakdownMessage += `🏠 Property Debt Updated: ${formatCurrency(newDebtAmount)}\n\n`
        }
        
        breakdownMessage += `💰 Financial Summary:\n`
        breakdownMessage += `• Original Amount: ${formatCurrency(result.originalAmount || result.detailedBreakdown.summary.originalAmount)}\n`
        breakdownMessage += `• Debt Subtracted: ${formatCurrency(result.debtSubtracted || result.detailedBreakdown.summary.debtAmount)}\n`
        breakdownMessage += `• Available After Debt: ${formatCurrency(result.availableAfterDebt)}\n`
        breakdownMessage += `• Total Distributed: ${formatCurrency(result.detailedBreakdown.summary.totalDistributed)}\n`
        breakdownMessage += `• Tiers Processed: ${result.detailedBreakdown.summary.tiersProcessed}\n`
        breakdownMessage += `• Individual Investors: ${result.detailedBreakdown.summary.totalInvestors}\n\n`
        
        breakdownMessage += `📋 Detailed Breakdown:\n\n`
        
        // Add breakdown by tier
        Object.entries(result.detailedBreakdown.byTier).forEach(([tierName, tierData]: [string, any]) => {
          breakdownMessage += `🏗️ ${tierName} (${tierData.tierType}): ${formatCurrency(tierData.totalAmount)}\n`
          
          if (tierData.investors.length > 0) {
            breakdownMessage += `  👤 Individual Investors:\n`
            tierData.investors.forEach((investor: any) => {
              // Calculate ownership percentage based on amount and total
              const ownershipPercentage = tierData.totalAmount > 0 ? (investor.amount / tierData.totalAmount) * 100 : 0
              breakdownMessage += `    • ${investor.name} (${ownershipPercentage.toFixed(1)}% ownership): ${formatCurrency(investor.amount)}\n`
            })
          }
          breakdownMessage += `\n`
        })
        
        setShowWaterfallModal(false)
        setDistributionData({
          waterfallStructureId: '',
          totalAmount: '',
          distributionDate: new Date().toISOString().split('T')[0],
          distributionType: 'RENTAL_INCOME',
          description: '',
          refinanceAmount: '',
          newDebtAmount: '',
          originationFees: '',
          closingFees: '',
          closingFeesItems: [],
          prepaymentPenalty: ''
        })
        await fetchWaterfallStructures()
        await fetchDistributions()
        alert(breakdownMessage)
      } else {
        const errorData = await response.json()
        console.error('Failed to process distribution:', errorData)
        console.error('Response status:', response.status)
        console.error('Response headers:', Object.fromEntries(response.headers.entries()))
        alert(`Failed to process distribution: ${errorData.error || 'Unknown error'}\n\nDetails: ${errorData.details || 'No additional details'}`)
      }
    } catch (error) {
      console.error('Error processing distribution:', error)
    }
  }

  const fetchDistributionBreakdown = async (distributionId: string) => {
    try {
      const response = await fetch(`/api/investors/waterfall-distributions/breakdown?id=${distributionId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      if (response.ok) {
        const breakdown = await response.json()
        setBreakdownData(breakdown)
        setShowBreakdownModal(true)
      } else {
        alert('Failed to fetch distribution breakdown')
      }
    } catch (error) {
      console.error('Error fetching distribution breakdown:', error)
      alert('Error fetching distribution breakdown')
    }
  }

  const addWaterfallTier = () => {
    setWaterfallData(prev => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        {
          tierNumber: prev.tiers.length + 1,
          tierName: `Tier ${prev.tiers.length + 1}`,
          tierType: 'RESIDUAL',
          priority: prev.tiers.length + 1,
          returnRate: null as number | null,
          catchUpPercentage: null as number | null,
          promotePercentage: null as number | null
        }
      ]
    }))
  }

  const removeWaterfallTier = (index: number) => {
    setWaterfallData(prev => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index).map((tier, i) => ({
        ...tier,
        tierNumber: i + 1,
        priority: i + 1
      }))
    }))
  }

  const updateWaterfallTier = (index: number, field: string, value: any) => {
    setWaterfallData(prev => ({
      ...prev,
      tiers: prev.tiers.map((tier, i) => 
        i === index ? { ...tier, [field]: value } : tier
      )
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading investment details...</p>
        </div>
      </div>
    )
  }

  if (!investment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Investment not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gray-50 pt-4 pb-8 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{investment.propertyName}</h1>
                <p className="text-sm text-gray-600">{investment.propertyAddress}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser?.role === 'ADMIN' && (
                <button
                  onClick={() => {
                    console.log('Edit Investment button clicked')
                    console.log('Investment object:', investment)
                    
                    if (!investment) {
                      console.error('Investment object is null or undefined')
                      alert('Investment data not loaded. Please refresh the page.')
                      return
                    }
                    
                    try {
                      // Populate edit data with current investment data - with safe conversions
                      const editDataToSet = {
                        investmentAmount: (investment.investmentAmount || 0).toString(),
                        ownershipPercentage: (investment.ownershipPercentage || 0).toString(),
                        monthlyRent: (investment.property.monthlyRent || 0).toString(),
                        capRate: (investment.property.capRate || 0).toString(),
                        occupancyRate: (investment.property.occupancyRate || 0).toString(),
                        annualExpenses: (investment.property.annualExpenses || 0).toString(),
                        currentValue: (investment.property.currentValue || 0).toString(),
                        debtAmount: investment.property.debtAmount?.toString() || '',
                        debtDetails: investment.property.debtDetails || '',
                        acquisitionPrice: (investment.property.acquisitionPrice || 0).toString(),
                        constructionCost: (investment.property.constructionCost || 0).toString(),
                        totalCost: (investment.property.totalCost || 0).toString(),
                        acquisitionDate: investment.property.acquisitionDate ? new Date(investment.property.acquisitionDate).toISOString().split('T')[0] : '',
                        constructionCompletionDate: investment.property.constructionCompletionDate ? new Date(investment.property.constructionCompletionDate).toISOString().split('T')[0] : '',
                        stabilizationDate: investment.property.stabilizationDate ? new Date(investment.property.stabilizationDate).toISOString().split('T')[0] : '',
                        investmentDate: investment.investmentDate ? new Date(investment.investmentDate).toISOString().split('T')[0] : '',
                        propertyName: investment.property.name || '',
                        propertyAddress: investment.property.address || '',
                        description: investment.property.description || '',
                        bedrooms: (investment.property.bedrooms || 0).toString(),
                        bathrooms: (investment.property.bathrooms || 0).toString(),
                        squareFeet: (investment.property.squareFeet || 0).toString(),
                        propertyType: investment.property.propertyType || 'RESIDENTIAL',
                        // Refinance fields - set to defaults for existing investments
                        isRefinance: false,
                        newLoanAmount: '',
                        oldLoanPayoff: '',
                        prepaymentPenalty: '',
                        originationFee: ''
                      }
                      
                      console.log('Setting edit data:', editDataToSet)
                      setEditData(editDataToSet)
                      setShowEditModal(true)
                      console.log('Edit modal should now be open')
                    } catch (error) {
                      console.error('Error setting edit data:', error)
                      console.error('Error details:', {
                        message: error instanceof Error ? error.message : 'Unknown error',
                        stack: error instanceof Error ? error.stack : 'No stack trace',
                        investment: investment,
                        property: investment?.property
                      })
                      alert('Error opening edit modal. Please try again.')
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200 font-medium"
                >
                  Edit Investment
                </button>
              )}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {currentUser?.role}
              </span>
              <span className="text-sm text-gray-600">
                {currentUser?.firstName} {currentUser?.lastName}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Investment Overview */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Investment Overview</h2>
              {(() => {
                // Calculate total investment from individual investor amounts
                const totalFromOwners = propertyEntityInvestments.reduce((sum, ei) => {
                  // Use per-deal owners if available, otherwise fall back to global entity owners
                  const owners = (ei.entityInvestmentOwners && ei.entityInvestmentOwners.length > 0) 
                    ? ei.entityInvestmentOwners 
                    : (ei.entity?.entityOwners || [])
                  const ownersSum = owners.reduce((ownerSum: number, owner: any) => 
                    ownerSum + (parseFloat(owner.investmentAmount || 0)), 0
                  )
                  return sum + ownersSum
                }, 0)
                const displayInvestmentAmount = totalFromOwners || investment.investmentAmount || 0
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Investment Amount</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(displayInvestmentAmount)}
                          </p>
                        </div>
                      </div>
                  <div className="flex items-center space-x-3">
                    <ChartBarIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Ownership Percentage</p>
                      <p className="text-lg font-semibold text-gray-900">{formatPercentage(investment.ownershipPercentage)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Investment Date</p>
                      <p className="text-lg font-semibold text-gray-900">{formatDate(investment.investmentDate)}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Property Type</p>
                      <p className="text-lg font-semibold text-gray-900">{investment.property.propertyType}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <HomeIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Property Details</p>
                      <p className="text-lg font-semibold text-gray-900">{investment.property.bedrooms} bed, {investment.property.bathrooms} bath</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(investment.status)}`}>
                      {investment.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <BanknotesIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Debt Amount</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {investment.property.debtAmount ? formatCurrency(investment.property.debtAmount) : 'No debt recorded'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
                )
              })()}
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Property Details</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{investment.property.name}</h3>
                  <p className="text-gray-600">{investment.property.address}</p>
                </div>
                <p className="text-gray-700">{investment.property.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <div>
                    <p className="text-sm text-gray-600">Square Feet</p>
                    <p className="font-medium">{investment.property.squareFeet.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monthly Rent</p>
                    <p className="font-medium">{formatCurrency(investment.property.monthlyRent)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cap Rate</p>
                    <p className="font-medium">{formatPercentage(investment.property.capRate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Occupancy</p>
                    <p className="font-medium">{formatPercentage(investment.property.occupancyRate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Financial Breakdown</h2>
              <div className="space-y-6">
                {/* Cost Structure */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Structure</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">Acquisition Price</p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatCurrency(investment.property.acquisitionPrice || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">Construction Cost</p>
                      <p className="text-xl font-bold text-green-900">
                        {formatCurrency(investment.property.constructionCost || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600 font-medium">Total Cost</p>
                      <p className="text-xl font-bold text-purple-900">
                        {formatCurrency(investment.property.totalCost || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Debt & Value */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Debt & Value</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600 font-medium">Total Debt</p>
                      <p className="text-xl font-bold text-red-900">
                        {investment.property.debtAmount ? formatCurrency(investment.property.debtAmount) : 'No debt recorded'}
                      </p>
                      {investment.property.debtDetails && (
                        <p className="text-sm text-red-700 mt-1">{investment.property.debtDetails}</p>
                      )}
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <p className="text-sm text-emerald-600 font-medium">Current Value</p>
                      <p className="text-xl font-bold text-emerald-900">
                        {formatCurrency(getCurrentNOICalculation())}
                      </p>
                      <p className="text-sm text-emerald-700 mt-1">
                        Based on NOI / Cap Rate (same as calculator)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Equity Analysis */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Equity Analysis</h3>
                  {(() => {
                    // Calculate total investment from entity investments
                    const totalInvestmentFromEntities = propertyEntityInvestments.reduce(
                      (sum: number, ei: any) => sum + (parseFloat(ei.investmentAmount || 0)), 
                      0
                    )
                    // Calculate total cost from acquisition price + construction cost
                    const acquisitionPrice = parseFloat(investment.property.acquisitionPrice || 0)
                    const constructionCost = parseFloat(investment.property.constructionCost || 0)
                    const totalCost = investment.property.totalCost 
                      ? parseFloat(investment.property.totalCost) 
                      : (acquisitionPrice + constructionCost)
                    const equityToCostAmount = totalInvestmentFromEntities
                    const equityToCostPercentage = totalCost > 0 ? (totalInvestmentFromEntities / totalCost) * 100 : 0
                    const currentValue = getCurrentNOICalculation()
                    const equityToValueAmount = currentValue - (investment.property.debtAmount || 0)
                    const equityToValuePercentage = currentValue > 0 ? (equityToValueAmount / currentValue) * 100 : 0
                    
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 font-medium">Total Investment</p>
                          <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(totalInvestmentFromEntities)}
                          </p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-600 font-medium">Equity to Cost</p>
                          <p className="text-xl font-bold text-blue-900">
                            {formatCurrency(equityToCostAmount)}
                          </p>
                          <p className="text-sm text-blue-700 mt-1">
                            {formatPercentage(equityToCostPercentage)} of total cost
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-600 font-medium">Equity to Value</p>
                          <p className="text-xl font-bold text-green-900">
                            {formatCurrency(equityToValueAmount)}
                          </p>
                          <p className="text-sm text-green-700 mt-1">
                            {formatPercentage(equityToValuePercentage)} of current value
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* Loans Management Section - Only visible to Admin and Manager */}
            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
              <div className="mt-6">
                <PropertyLoansManager 
                  propertyId={investment.property.id} 
                  authToken={getAuthToken()}
                />
              </div>
            )}

            {/* Investor Details and Entity Structure */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Investor Details & Entity Structure</h2>
              


              {/* Entity Investments */}
              {propertyEntityInvestments.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Entity Investments</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {propertyEntityInvestments.length} entit{propertyEntityInvestments.length !== 1 ? 'ies' : 'y'}
                      </span>
                      <span className="text-sm text-blue-600 font-medium">
                        {propertyEntityInvestments.reduce((total: number, ei: any) => 
                          total + (ei.entity.entityOwners?.length || 0), 0
                        )} total individual investors
                      </span>
                    </div>
                  </div>
                  {propertyEntityInvestments.map((entityInvestment) => (
                    <div key={entityInvestment.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{entityInvestment.entity.name}</h4>
                          <p className="text-sm text-gray-600">{entityInvestment.entity.type}</p>
                        </div>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Investment</p>
                          <p className="font-medium text-gray-900">{formatCurrency(entityInvestment.investmentAmount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Ownership %</p>
                          <p className="font-medium text-gray-900">{formatPercentage(entityInvestment.ownershipPercentage)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Investment Date</p>
                          <p className="font-medium text-gray-900">{formatDate(entityInvestment.investmentDate)}</p>
                        </div>
                      </div>

                      {/* Entity Owners - prefer per-deal owners if available */}
                      {(() => {
                        // Determine which owners to display - prioritize per-deal owners
                        const hasPerDealOwners = entityInvestment.entityInvestmentOwners && Array.isArray(entityInvestment.entityInvestmentOwners) && entityInvestment.entityInvestmentOwners.length > 0
                        const hasGlobalOwners = entityInvestment.entity?.entityOwners && Array.isArray(entityInvestment.entity.entityOwners) && entityInvestment.entity.entityOwners.length > 0
                        const ownersToDisplay = hasPerDealOwners ? entityInvestment.entityInvestmentOwners : (hasGlobalOwners ? entityInvestment.entity.entityOwners : [])
                        
                        if (ownersToDisplay.length === 0) return null
                        
                        return (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-medium text-gray-700">Individual Investors ({ownersToDisplay.length})</h5>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                {ownersToDisplay.length} investor{ownersToDisplay.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="space-y-3">
                              {ownersToDisplay.map((owner: any) => (
                              <div key={owner.id} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                                      <span className="text-blue-700 font-semibold text-sm">
                                        {owner.user?.firstName || owner.user?.lastName ? `${(owner.user?.firstName || '').charAt(0)}${(owner.user?.lastName || '').charAt(0)}` : '🏢'}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">{owner.user?.firstName || owner.user?.lastName ? `${owner.user?.firstName || ''} ${owner.user?.lastName || ''}`.trim() : (owner.investorEntity?.name || 'Investing Entity')}</p>
                                      <p className="text-sm text-gray-600">{owner.user?.email || (owner.investorEntity?.name ? 'Entity investor' : '')}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                                      {formatPercentage(owner.ownershipPercentage)} of entity
                                    </span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Investment Amount</p>
                                    <p className="font-bold text-gray-900 text-lg">{formatCurrency(owner.investmentAmount)}</p>
                                  </div>
                                  <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Entity Ownership</p>
                                    <p className="font-bold text-blue-700 text-lg">{formatPercentage(owner.ownershipPercentage)}</p>
                                  </div>
                                  <div className="bg-green-50 p-3 rounded-lg">
                                    <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Property Ownership</p>
                                    <p className="font-bold text-green-700 text-lg">
                                      {formatPercentage((owner.ownershipPercentage / 100) * entityInvestment.ownershipPercentage)}
                                    </p>
                                  </div>
                                </div>
                                {Array.isArray(owner.breakdown) && owner.breakdown.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <button
                                      type="button"
                                      onClick={() => setOpenOwnerBreakdownId(openOwnerBreakdownId === owner.id ? null : owner.id)}
                                      className="text-xs text-blue-600 hover:text-blue-700"
                                    >
                                      {openOwnerBreakdownId === owner.id ? 'Hide entity investment breakdown' : 'View entity investment breakdown'}
                                    </button>
                                    {openOwnerBreakdownId === owner.id && (
                                      <div className="mt-2 space-y-1">
                                        {owner.breakdown.map((row: any) => (
                                          <div key={row.id} className="flex justify-between text-xs text-gray-700">
                                            <span>{row.label}</span>
                                            <span className="font-medium">{formatCurrency(parseFloat(row.amount || 0))}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex justify-between text-xs text-gray-500">
                                    <span className="font-medium">Entity: {entityInvestment.entity.name}</span>
                                    <span className="font-medium">Type: {entityInvestment.entity.type}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              )}

              {/* All Investors Summary (hidden to avoid redundancy with section above) */}
              {false && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">All Investors Summary</h3>
                
                {/* Direct Investors */}
                {investment.investmentType !== 'ENTITY' && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Direct Investors</h4>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {investment.investorName ? 
                                investment.investorName.split(' ').map((n: string) => n.charAt(0)).join('') : 
                                'DI'
                              }
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{investment.investorName || 'Direct Investment'}</p>
                            <p className="text-xs text-gray-600">{investment.investorEmail || 'N/A'}</p>
                          </div>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {formatPercentage(investment.ownershipPercentage)} of property
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Investment Amount</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(investment.investmentAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Investment Date</p>
                          <p className="font-semibold text-gray-900">{formatDate(investment.investmentDate)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Entity Investors Summary */}
                {propertyEntityInvestments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Entity Investors</h4>
                    <div className="space-y-3">
                      {propertyEntityInvestments.map((entityInvestment) => (
                        <div key={entityInvestment.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-600 font-medium text-sm">
                                  {entityInvestment.entity.name.split(' ').map((n: string) => n.charAt(0)).join('').substring(0, 2)}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{entityInvestment.entity.name}</p>
                                <p className="text-xs text-gray-600">{entityInvestment.entity.type} • {formatPercentage(entityInvestment.ownershipPercentage)} of property</p>
                              </div>
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              {entityInvestment.entity.entityOwners?.length || 0} investors
                            </span>
                          </div>
                          
                          {/* Individual investors within entity */}
                          {entityInvestment.entity.entityOwners && entityInvestment.entity.entityOwners.length > 0 && (
                            <div className="space-y-2">
                              {entityInvestment.entity.entityOwners.map((owner: any) => (
                                <div key={owner.id} className="flex items-center justify-between p-2 bg-white rounded border border-green-100">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                      <span className="text-gray-600 font-medium text-xs">
                                        {(owner.user?.firstName || '').charAt(0)}{(owner.user?.lastName || '').charAt(0)}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{owner.user?.firstName || ''} {owner.user?.lastName || ''}</p>
                                      <p className="text-xs text-gray-600">{owner.user?.email || ''}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">{formatCurrency(owner.investmentAmount)}</p>
                                    <p className="text-xs text-gray-600">
                                      {formatPercentage(owner.ownershipPercentage)} of entity • {formatPercentage((owner.ownershipPercentage / 100) * entityInvestment.ownershipPercentage)} of property
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total Investment Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Total Investment Amount</p>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(
                          (investment.investmentType !== 'ENTITY' ? investment.investmentAmount : 0) +
                          propertyEntityInvestments.reduce((sum, ei) => sum + ei.investmentAmount, 0)
                        )}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Total Investors</p>
                      <p className="font-semibold text-gray-900">
                        {(investment.investmentType !== 'ENTITY' ? 1 : 0) +
                        propertyEntityInvestments.reduce((sum, ei) => sum + (ei.entity.entityOwners?.length || 0), 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Total Entities</p>
                      <p className="font-semibold text-gray-900">{propertyEntityInvestments.length}</p>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Property Timeline */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Property Timeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Acquisition Date</p>
                    <p className="font-medium text-gray-900">{investment.property.acquisitionDate ? formatDate(investment.property.acquisitionDate) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Time Held</p>
                    <p className="font-medium text-gray-900">
                      {investment.property.acquisitionDate ? 
                        `${Math.floor((new Date().getTime() - new Date(investment.property.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} years` : 
                        'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Acquisition Price</p>
                    <p className="font-medium text-gray-900">{formatCurrency(investment.property.acquisitionPrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Value</p>
                    <p className="font-medium text-gray-900">{formatCurrency(getCurrentNOICalculation())}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Distributions */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Distributions</h2>
              
              {/* Waterfall Distributions */}
              {waterfallStructures.some(structure => structure.waterfallDistributions && structure.waterfallDistributions.length > 0) ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Waterfall Distributions</h3>
                  {waterfallStructures.map(structure => 
                    structure.waterfallDistributions && structure.waterfallDistributions.length > 0 && 
                    structure.waterfallDistributions.map((distribution: any) => (
                      <div key={distribution.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-gray-900">{distribution.description || `Distribution from ${structure.name}`}</p>
                            <p className="text-sm text-gray-600">{formatDate(distribution.distributionDate)}</p>
                            <p className="text-xs text-blue-600">Waterfall: {structure.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-600">{formatCurrency(distribution.totalAmount)}</p>
                            <p className="text-sm text-gray-600">{distribution.distributionType}</p>
                          </div>
                        </div>
                        
                        {/* Distribution Breakdown */}
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700">Distribution Breakdown</p>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  // Fetch and display detailed breakdown
                                  fetchDistributionBreakdown(distribution.id)
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100 px-2 py-1 rounded transition-colors duration-200"
                              >
                                View Details
                              </button>
                              {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                                <>
                                  <button
                                    onClick={() => handleEditDistribution(distribution)}
                                    className="text-xs text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 px-2 py-1 rounded transition-colors duration-200"
                                    title="Edit Distribution"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDistribution(distribution.id)}
                                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-100 px-2 py-1 rounded transition-colors duration-200"
                                    title="Delete Distribution"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Quick Summary */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white p-2 rounded border">
                              <p className="text-gray-600">Total Distributed</p>
                              <p className="font-medium text-green-600">{formatCurrency(distribution.totalAmount)}</p>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <p className="text-gray-600">Status</p>
                              <p className="font-medium text-blue-600">{distribution.isProcessed ? 'Processed' : 'Pending'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
              
              {/* Legacy Distributions */}
              {investment.distributions.length > 0 ? (
                <div className="space-y-4">
                  {waterfallStructures.some(structure => structure.waterfallDistributions && structure.waterfallDistributions.length > 0) && (
                    <h3 className="text-lg font-medium text-gray-800 mb-3 mt-6">Legacy Distributions</h3>
                  )}
                  {investment.distributions.map((distribution) => (
                    <div key={distribution.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{distribution.description}</p>
                        <p className="text-sm text-gray-600">{formatDate(distribution.distributionDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">{formatCurrency(distribution.amount)}</p>
                        <p className="text-sm text-gray-600">{distribution.distributionType}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              
              {/* Distributions List */}
              {allDistributions.length > 0 ? (
                <div className="space-y-3">
                  {allDistributions.map((distribution) => (
                    <div key={distribution.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(distribution.totalAmount)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatDate(distribution.distributionDate)} • {distribution.waterfallStructure?.name || 'Global Structure'}
                          </p>
                          {distribution.description && (
                            <p className="text-xs text-gray-500">{distribution.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => fetchDistributionBreakdown(distribution.id)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                          title="View Breakdown"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                          <>
                            <button
                              onClick={() => handleEditDistribution(distribution)}
                              className="p-2 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-lg transition-colors duration-200"
                              title="Edit Distribution"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDistribution(distribution.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Delete Distribution"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No distributions yet</p>
              )}
            </div>
          </div>
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Documents */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <DocumentIcon className="h-5 w-5 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-600">{formatDate(doc.uploadedAt)} • {doc.documentType}</p>
                        <p className="text-xs text-gray-500">{doc.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => window.open(`/api/documents/${doc.id}?user=${encodeURIComponent(currentUser.email)}`, '_blank')}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                        title="View Document"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = `/api/documents/${doc.id}?user=${encodeURIComponent(currentUser.email)}`
                          link.download = doc.fileName
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        }}
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors duration-200"
                        title="Download Document"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                      {currentUser?.role === 'ADMIN' && (
                        <>
                          <button
                            onClick={() => handleEditDocument(doc)}
                            className="p-2 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-lg transition-colors duration-200"
                            title="Edit Document"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete Document"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-gray-600 text-sm">No documents uploaded yet</p>
                )}
              </div>
            </div>



            {/* Entity Management (Admin only) */}
            {currentUser?.role === 'ADMIN' && (
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Entity Management</h2>
                  <button
                    onClick={async () => {
                      if (availableEntities.length === 0) {
                        await fetchAvailableEntities()
                      }
                      setShowSelectEntityModal(true)
                    }}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Active entities in this project:</p>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {propertyEntityInvestments.length} {propertyEntityInvestments.length === 1 ? 'entity' : 'entities'}
                    </span>
                  </div>
                  
                  {propertyEntityInvestments.length > 0 ? (
                    <div className="space-y-3">
                      {propertyEntityInvestments.map((entityInvestment) => (
                        <div key={entityInvestment.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{entityInvestment.entity.name}</p>
                              <p className="text-sm text-gray-600">{entityInvestment.entity.type}</p>
                              <p className="text-xs text-blue-600">{formatCurrency(entityInvestment.investmentAmount)} • {formatPercentage(parseFloat(entityInvestment.ownershipPercentage || '0'))}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                              <button
                                onClick={() => handleEditEntity(entityInvestment)}
                                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors duration-200"
                                title="Edit Entity"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntity(entityInvestment.id)}
                                className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors duration-200"
                                title="Delete Entity"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Entity Owners - prefer per-deal owners if available */}
                          {((entityInvestment.entityInvestmentOwners && entityInvestment.entityInvestmentOwners.length > 0) || (entityInvestment.entity.entityOwners && entityInvestment.entity.entityOwners.length > 0)) && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-700 mb-1">Investors:</p>
                              <div className="space-y-1">
                                {(entityInvestment.entityInvestmentOwners && entityInvestment.entityInvestmentOwners.length > 0 ? entityInvestment.entityInvestmentOwners : entityInvestment.entity.entityOwners).map((owner: any) => (
                                  <div key={owner.id} className="flex justify-between text-xs">
                                    <span className="text-gray-600">{owner.user?.firstName || owner.user?.lastName ? `${owner.user?.firstName || ''} ${owner.user?.lastName || ''}`.trim() : (owner.investorEntity?.name || 'Investing Entity')}</span>
                                    <span className="text-gray-800">{formatPercentage(owner.ownershipPercentage)} • {formatCurrency(owner.investmentAmount)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No entities active in this project</p>
                  )}
                  
                  <button
                    onClick={async () => {
                      if (availableEntities.length === 0) {
                        await fetchAvailableEntities()
                      }
                      setShowSelectEntityModal(true)
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200 font-medium"
                  >
                    Add New Entity
                  </button>
                </div>
              </div>
            )}



            {/* Multi-Investor Management removed per request */}
            {false && currentUser?.role === 'ADMIN' && (<div />)}

            {/* NOI Calculator */}
            {(((investment as any)?.property as any)?.['dealStatus']) !== 'UNDER_CONSTRUCTION' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">NOI Calculator</h2>
                <button
                  onClick={() => {
                    setNoiData({
                      monthlyRent: investment?.property?.monthlyRent?.toString() || '',
                      otherIncome: investment?.property?.otherIncome?.toString() || '0',
                      annualExpenses: investment?.property?.annualExpenses?.toString() || '',
                      capRate: investment?.property?.capRate?.toString() || '',
                      currentValueEstimate: investment?.property?.currentValue?.toString() || ''
                    })
                    setShowNOIModal(true)
                  }}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                >
                  <CalculatorIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Annual Rent:</span>
                  <span className="font-medium">{formatCurrency((investment?.property?.monthlyRent || 0) * 12)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Annual Other Income:</span>
                  <span className="font-medium">{formatCurrency((investment?.property?.otherIncome || 0) * 12)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Annual Revenue:</span>
                  <span className="font-medium">{formatCurrency(((investment?.property?.monthlyRent || 0) * 12) + ((investment?.property?.otherIncome || 0) * 12))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Annual Expenses:</span>
                  <span className="font-medium">{formatCurrency(investment?.property?.annualExpenses || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">NOI:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(((investment?.property?.monthlyRent || 0) * 12) + ((investment?.property?.otherIncome || 0) * 12) - (investment?.property?.annualExpenses || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cap Rate:</span>
                  <span className="font-medium">{formatPercentage(investment?.property?.capRate || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Estimated Value:</span>
                  <span className="font-medium text-blue-600">
                    {investment?.property?.capRate > 0 ? 
                      formatCurrency((((investment?.property?.monthlyRent || 0) * 12) + ((investment?.property?.otherIncome || 0) * 12) - (investment?.property?.annualExpenses || 0)) / (investment?.property?.capRate / 100)) : 
                      'N/A'
                    }
                  </span>
                </div>
                <button
                  onClick={() => {
                    setNoiData({
                      monthlyRent: investment?.property?.monthlyRent?.toString() || '',
                      otherIncome: investment?.property?.otherIncome?.toString() || '0',
                      annualExpenses: investment?.property?.annualExpenses?.toString() || '',
                      capRate: investment?.property?.capRate?.toString() || '',
                      currentValueEstimate: investment?.property?.currentValue?.toString() || ''
                    })
                    setShowNOIModal(true)
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200 font-medium"
                >
                  Update NOI Calculations
                </button>
              </div>
            </div>
            )}

            {/* Deal Status Management (Admins/Managers) */}
            {((currentUser as any)?.role === 'ADMIN' || (currentUser as any)?.role === 'MANAGER') && (
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Deal Status</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Deal Status</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={(investment as any)?.property?.dealStatus || 'STABILIZED'}
                      onChange={async (e) => {
                        const dealStatus = e.target.value
                        try {
                          await fetch(`/api/investors/properties/${(investment as any)?.property?.id}` ,{
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('authToken') || ''}` },
                            body: JSON.stringify({ dealStatus })
                          })
                          // Optimistic update
                          setInvestment(prev => prev ? ({...prev, property: ({...(prev as any).property, dealStatus})}) as any : prev)
                        } catch {}
                      }}
                    >
                      <option value="STABILIZED">STABILIZED</option>
                      <option value="UNDER_CONSTRUCTION">UNDER_CONSTRUCTION</option>
                      <option value="UNDER_CONTRACT">UNDER_CONTRACT</option>
                      <option value="SOLD">SOLD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Funding Status</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={(investment as any)?.property?.fundingStatus || 'FUNDED'}
                      onChange={async (e) => {
                        const fundingStatus = e.target.value
                        try {
                          await fetch(`/api/investors/properties/${(investment as any)?.property?.id}` ,{
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('authToken') || ''}` },
                            body: JSON.stringify({ fundingStatus })
                          })
                          setInvestment(prev => prev ? ({...prev, property: ({...(prev as any).property, fundingStatus})}) as any : prev)
                        } catch {}
                      }}
                    >
                      <option value="FUNDED">FUNDED</option>
                      <option value="FUNDING">FUNDING</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Insurance Information - Only visible to ADMIN and MANAGER */}
            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Insurance</h2>
                  <button
                    onClick={() => setShowInsuranceModal(true)}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  {insuranceHistory.length > 0 ? (
                    <div className="space-y-2">
                      {insuranceHistory.slice(0, 3).map((insurance: any) => (
                        <div key={insurance.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{insurance.provider}</p>
                              <p className="text-sm text-gray-600">Policy: {insurance.policyNumber}</p>
                              <p className="text-sm text-gray-600">Premium: {formatCurrency(insurance.annualPremium)}</p>
                            </div>
                            <span className="text-xs text-gray-500">{formatDate(insurance.renewalDate)}</span>
                          </div>
                        </div>
                      ))}
                      {insuranceHistory.length > 3 && (
                        <p className="text-sm text-gray-500">+{insuranceHistory.length - 3} more records</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No insurance records</p>
                  )}
                  <button
                    onClick={() => setShowInsuranceModal(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200 font-medium"
                  >
                    Add Insurance
                  </button>
                </div>
              </div>
            )}

            {/* Tax Information - Only visible to ADMIN and MANAGER */}
            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Property Taxes</h2>
                  <button
                    onClick={() => setShowTaxModal(true)}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  {taxHistory.length > 0 ? (
                    <div className="space-y-2">
                      {taxHistory.slice(0, 3).map((tax: any) => (
                        <div key={tax.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">Tax Year {tax.taxYear}</p>
                              <p className="text-sm text-gray-600">Amount: {formatCurrency(tax.annualPropertyTax)}</p>
                            </div>
                            <span className="text-xs text-gray-500">{formatDate(tax.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                      {taxHistory.length > 3 && (
                        <p className="text-sm text-gray-500">+{taxHistory.length - 3} more records</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No tax records</p>
                  )}
                  <button
                    onClick={() => setShowTaxModal(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200 font-medium"
                  >
                    Add Tax Information
                  </button>
                </div>
              </div>
            )}

            {/* Waterfall Distributions - Only visible to ADMIN and MANAGER */}
            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
              <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Waterfall Distributions</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowCreateWaterfallModal(true)}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                    title="Create Waterfall Structure"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                  {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                    <button
                      onClick={() => setShowWaterfallModal(true)}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors duration-200"
                      title="Process Distribution"
                    >
                      <BanknotesIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {waterfallStructures.length > 0 ? (
                  <div className="space-y-2">
                    {waterfallStructures.slice(0, showAllWaterfallStructures ? undefined : 3).map((structure: any) => (
                      <div key={structure.id} className="p-3 bg-gray-50 rounded-lg border">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{structure.name}</p>
                                <p className="text-sm text-gray-600">{structure.description}</p>
                                <p className="text-xs text-gray-500">{structure.waterfallTiers.length} tiers</p>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditWaterfallStructure(structure)}
                                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                  title="Edit Structure"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => {
                                    console.log('Delete button clicked for structure:', structure.id, structure.name)
                                    handleDeleteWaterfallStructure(structure.id)
                                  }}
                                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                  title="Delete Structure"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                            {structure.waterfallDistributions && structure.waterfallDistributions.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-700 mb-1">Distributions:</p>
                                {structure.waterfallDistributions.slice(0, 2).map((distribution: any) => (
                                  <div key={distribution.id} className="flex justify-between items-center text-xs text-gray-600 mb-1">
                                    <span>{formatCurrency(distribution.totalAmount)} - {distribution.distributionType}</span>
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={() => handleEditDistribution(distribution)}
                                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                        title="Edit Distribution"
                                      >
                                        <PencilIcon className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteDistribution(distribution.id)}
                                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                        title="Delete Distribution"
                                      >
                                        <TrashIcon className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {structure.waterfallDistributions.length > 2 && (
                                  <p className="text-xs text-gray-500">+{structure.waterfallDistributions.length - 2} more distributions</p>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{formatDate(structure.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                    {waterfallStructures.length > 3 && (
                      <button
                        onClick={() => {
                          console.log('+X more structures button clicked!')
                          console.log('Current showAllWaterfallStructures:', showAllWaterfallStructures)
                          console.log('Total waterfall structures:', waterfallStructures.length)
                          setShowAllWaterfallStructures(!showAllWaterfallStructures)
                        }}
                        className="w-full text-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-3 rounded-lg border border-blue-200 transition-colors duration-200 font-medium"
                      >
                        {showAllWaterfallStructures 
                          ? `Show Less` 
                          : `+${waterfallStructures.length - 3} more structures`
                        }
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No waterfall structures</p>
                )}
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowCreateWaterfallModal(true)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200 font-medium"
                    >
                      Create Structure
                    </button>
                    <button
                      onClick={() => {
                        // Check if selected structure is global
                        const selectedStructureData = waterfallStructures.find(s => s.id === distributionData.waterfallStructureId) || 
                                                     globalWaterfallStructures.find(s => s.id === distributionData.waterfallStructureId)
                        if (selectedStructureData && !selectedStructureData.propertyId) {
                          alert('Cannot process distributions from global structures. Please copy the structure to create a local one first.')
                          return
                        }
                        setShowWaterfallModal(true)
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors duration-200 font-medium"
                    >
                      Process Distribution
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowCreateGlobalWaterfallModal(true)}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors duration-200 font-medium"
                    >
                      Create Global Structure
                    </button>
                    <button
                      onClick={() => setShowApplyWaterfallModal(true)}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg transition-colors duration-200 font-medium"
                    >
                      Apply Structure
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-8 pb-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title
                </label>
                <input
                  type="text"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newDocument.description}
                  onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={newDocument.documentType}
                  onChange={(e) => setNewDocument({ ...newDocument, documentType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select document type</option>
                  <option value="OFFERING_MEMORANDUM">Offering Memorandum</option>
                  <option value="OPERATING_AGREEMENT">Operating Agreement</option>
                  <option value="PPM">PPM</option>
                  <option value="FINANCIAL_STATEMENT">Financial Statement</option>
                  <option value="TAX_DOCUMENT">Tax Document</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="TITLE_REPORT">Title Report</option>
                  <option value="APPRAISAL">Appraisal</option>
                  <option value="ENVIRONMENTAL_REPORT">Environmental Report</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File
                </label>
                <input
                  type="file"
                  onChange={(e) => setNewDocument({ ...newDocument, file: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Investment Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto pt-8 pb-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Edit Investment</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditInvestment} className="space-y-6">
              {/* Investment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Investment Details</h4>
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Investment amount is calculated from entity investments and cannot be edited here.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ownership Percentage
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editData.ownershipPercentage}
                        onChange={(e) => setEditData({ ...editData, ownershipPercentage: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Investment Date
                      </label>
                      <input
                        type="date"
                        value={editData.investmentDate}
                        onChange={(e) => setEditData({ ...editData, investmentDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                  </div>
                </div>

                {/* Property Details */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Property Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Name
                      </label>
                      <input
                        type="text"
                        value={editData.propertyName}
                        onChange={(e) => setEditData({ ...editData, propertyName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Address
                      </label>
                      <input
                        type="text"
                        value={editData.propertyAddress}
                        onChange={(e) => setEditData({ ...editData, propertyAddress: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bedrooms
                        </label>
                        <input
                          type="number"
                          value={editData.bedrooms}
                          onChange={(e) => setEditData({ ...editData, bedrooms: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bathrooms
                        </label>
                        <input
                          type="number"
                          value={editData.bathrooms}
                          onChange={(e) => setEditData({ ...editData, bathrooms: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Financial Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monthly Rent
                      </label>
                      <input
                        type="number"
                        value={editData.monthlyRent}
                        onChange={(e) => setEditData({ ...editData, monthlyRent: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cap Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editData.capRate}
                        onChange={(e) => setEditData({ ...editData, capRate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Acquisition Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editData.acquisitionPrice}
                        onChange={(e) => {
                          const newAcquisitionPrice = e.target.value;
                          const constructionCost = parseFloat(editData.constructionCost) || 0;
                          const totalCost = parseFloat(newAcquisitionPrice) + constructionCost;
                          setEditData({ 
                            ...editData, 
                            acquisitionPrice: newAcquisitionPrice,
                            totalCost: totalCost.toString()
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Construction Cost
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editData.constructionCost}
                        onChange={(e) => {
                          const newConstructionCost = e.target.value;
                          const acquisitionPrice = parseFloat(editData.acquisitionPrice) || 0;
                          const totalCost = acquisitionPrice + parseFloat(newConstructionCost);
                          setEditData({ 
                            ...editData, 
                            constructionCost: newConstructionCost,
                            totalCost: totalCost.toString()
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Cost (Auto-calculated)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editData.totalCost}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Total Cost = Acquisition Price + Construction Cost
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Occupancy Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editData.occupancyRate}
                        onChange={(e) => setEditData({ ...editData, occupancyRate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Annual Expenses
                      </label>
                      <input
                        type="number"
                        value={editData.annualExpenses}
                        onChange={(e) => setEditData({ ...editData, annualExpenses: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Debt Details */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Debt Information</h4>
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Debt amount is managed in the Property Loans section and cannot be edited here.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Debt Details
                      </label>
                      <textarea
                        value={editData.debtDetails}
                        onChange={(e) => setEditData({ ...editData, debtDetails: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Bank, loan terms, interest rate, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Square Feet
                      </label>
                      <input
                        type="number"
                        value={editData.squareFeet}
                        onChange={(e) => setEditData({ ...editData, squareFeet: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Type
                      </label>
                      <select
                        value={editData.propertyType}
                        onChange={(e) => setEditData({ ...editData, propertyType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="RESIDENTIAL">Residential</option>
                        <option value="COMMERCIAL">Commercial</option>
                        <option value="MIXED_USE">Mixed Use</option>
                        <option value="INDUSTRIAL">Industrial</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>


              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Description
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>



              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Entity Contact Person Modal */}
      {showUpdateEntityContactModal && pendingEntityContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Set Contact For: {pendingEntityContact.name}</h3>
              <span className="text-xs text-gray-500">Required before adding entity</span>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!pendingEntityContact) return
                if (!pendingEntityContact.contactPerson || pendingEntityContact.contactPerson.trim() === '') {
                  alert('Contact Person is required.')
                  return
                }
                try {
                  const res = await fetch(`/api/investors/entities/${pendingEntityContact.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify({
                      contactPerson: pendingEntityContact.contactPerson,
                      contactEmail: pendingEntityContact.contactEmail,
                      contactPhone: pendingEntityContact.contactPhone,
                    })
                  })
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    alert(err.error || 'Failed to update entity contact info')
                    return
                  }
                  // Refresh entities to get updated record
                  await fetchAvailableEntities()
                  // If this was triggered from a selection within entity investors, apply the selection now
                  if (pendingEntitySelectionIndex !== null) {
                    const updatedEntity = availableEntities.find(e => e.id === pendingEntityContact.id)
                    if (updatedEntity) {
                      updateEntityInvestor(pendingEntitySelectionIndex, 'userId', '')
                      updateEntityInvestor(pendingEntitySelectionIndex, 'investorEntityId', updatedEntity.id)
                      updateEntityInvestor(pendingEntitySelectionIndex, 'isEntityInvestor', true)
                      updateEntityInvestor(pendingEntitySelectionIndex, 'entityName', updatedEntity.name)
                      updateEntityInvestor(pendingEntitySelectionIndex, 'entityOwnersSnapshot', (updatedEntity as any).entityOwners || [])
                      updateEntityInvestor(pendingEntitySelectionIndex, 'user', { firstName: '', lastName: '', email: '' })
                    }
                  }
                  setShowUpdateEntityContactModal(false)
                  setPendingEntityContact(null)
                  setPendingEntitySelectionIndex(null)
                } catch (err) {
                  console.error('Failed updating entity contact:', err)
                  alert('Error updating entity contact. Please try again.')
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pendingEntityContact.contactPerson}
                  onChange={(e) => setPendingEntityContact(prev => prev ? { ...prev, contactPerson: e.target.value } : prev)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                <input
                  type="email"
                  value={pendingEntityContact.contactEmail}
                  onChange={(e) => setPendingEntityContact(prev => prev ? { ...prev, contactEmail: e.target.value } : prev)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                <input
                  type="tel"
                  value={pendingEntityContact.contactPhone}
                  onChange={(e) => setPendingEntityContact(prev => prev ? { ...prev, contactPhone: e.target.value } : prev)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex pt-4">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Save Contact Info
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Select Existing Entity Modal */}
      {showSelectEntityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto pt-8 pb-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Add Entity to Project</h3>
              <button
                onClick={() => setShowSelectEntityModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Select from Existing Entities</h4>
                {(() => {
                  // Filter out entities already in this project
                  const existingEntityIds = propertyEntityInvestments.map((ei: any) => String(ei.entityId))
                  const availableToAdd = availableEntities.filter((entity: any) => !existingEntityIds.includes(String(entity.id)))
                  
                  if (availableToAdd.length === 0) {
                    return (
                      <p className="text-sm text-gray-500 italic py-4">
                        No other entities available. All existing entities are already added to this project.
                      </p>
                    )
                  }
                  
                  return (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableToAdd.map((entity: any) => (
                        <div
                          key={entity.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{entity.name}</p>
                            <p className="text-sm text-gray-600">{entity.type}</p>
                            {entity.contactPerson && (
                              <p className="text-xs text-gray-500 mt-1">Contact: {entity.contactPerson}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddExistingEntityToProperty(entity.id)}
                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200 text-sm font-medium"
                          >
                            Add to Project
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowSelectEntityModal(false)
                    setShowCreateEntityModal(true)
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors duration-200 font-medium"
                >
                  Create New Entity Instead
                </button>
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSelectEntityModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Entity Modal */}
      {showCreateEntityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto pt-8 pb-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create New Entity</h3>
              <button
                onClick={() => setShowCreateEntityModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEntity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Name
                </label>
                <input
                  type="text"
                  value={newEntity.name}
                  onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Type
                </label>
                <select
                  value={newEntity.type}
                  onChange={(e) => setNewEntity({ ...newEntity, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="LLC">LLC</option>
                  <option value="CORPORATION">Corporation</option>
                  <option value="PARTNERSHIP">Partnership</option>
                  <option value="TRUST">Trust</option>
                  <option value="OPERATOR">Operator</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={newEntity.address}
                  onChange={(e) => setNewEntity({ ...newEntity, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID
                </label>
                <input
                  type="text"
                  value={newEntity.taxId}
                  onChange={(e) => setNewEntity({ ...newEntity, taxId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newEntity.contactPerson}
                  onChange={(e) => setNewEntity({ ...newEntity, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={newEntity.contactEmail}
                  onChange={(e) => setNewEntity({ ...newEntity, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={newEntity.contactPhone}
                  onChange={(e) => setNewEntity({ ...newEntity, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateEntityModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Create Entity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Entity as Investor Modal */}
      {/* Multi-Investor Modal removed per request */}
      {false && showMultiInvestorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create Multi-Investor Investment</h3>
              <button
                onClick={() => setShowMultiInvestorModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateMultiInvestorInvestment} className="space-y-6">
              {/* Entity and Property Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Entity
                  </label>
                  <div className="space-y-2">
                    <select
                      value={multiInvestorData.entityId}
                      onChange={(e) => setMultiInvestorData({ ...multiInvestorData, entityId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={loadingEntities}
                    >
                      <option value="">
                        {loadingEntities ? 'Loading entities...' : 'Select an entity...'}
                      </option>
                      {availableEntities.map(entity => (
                        <option key={entity.id} value={String(entity.id)}>
                          {entity.name} ({entity.type})
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {loadingEntities ? 'Loading...' : `${availableEntities.length} entities available`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCreateEntityInModal(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors duration-200"
                      >
                        + Create New Entity
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property
                  </label>
                  <input
                    type="text"
                    value={investment?.property?.name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                  />
                </div>
              </div>

              {/* Investment Amounts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Investment Amount
                  </label>
                  <input
                    type="number"
                    value={multiInvestorData.totalInvestmentAmount}
                    onChange={(e) => setMultiInvestorData({ ...multiInvestorData, totalInvestmentAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entity Ownership % of Total Deal
                  </label>
                  <input
                    type="number"
                    value={multiInvestorData.entityOwnershipPercentage}
                    onChange={(e) => setMultiInvestorData({ ...multiInvestorData, entityOwnershipPercentage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.0"
                    step="0.1"
                    required
                  />
                </div>
              </div>

              {/* Investors Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Entity Investors</h4>
                  <button
                    type="button"
                    onClick={addInvestor}
                    className="px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors duration-200"
                  >
                    Add Investor
                  </button>
                </div>
                
                <div className="space-y-4">
                  {multiInvestorData.investors.map((investor, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900">Investor {index + 1}</h5>
                        {multiInvestorData.investors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeInvestor(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Investor Type
                          </label>
                          <select
                            value={investor.investorType}
                            onChange={(e) => {
                              updateInvestor(index, 'investorType', e.target.value)
                              // Reset investor selection when type changes
                              updateInvestor(index, 'userId', '')
                              updateInvestor(index, 'entityId', '')
                              updateInvestor(index, 'userEmail', '')
                              updateInvestor(index, 'userName', '')
                              updateInvestor(index, 'entityName', '')
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="INDIVIDUAL">Individual</option>
                            <option value="ENTITY">Entity</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select {investor.investorType === 'ENTITY' ? 'Entity' : 'Investor'}
                          </label>
                          {investor.investorType === 'ENTITY' ? (
                            <select
                              value={investor.entityId}
                              onChange={(e) => {
                                const selectedEntity = availableEntities.find(e => String(e.id) === e.target.value)
                                updateInvestor(index, 'entityId', e.target.value)
                                updateInvestor(index, 'entityName', selectedEntity?.name || '')
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            >
                              <option value="">Select entity...</option>
                              {availableEntities.map(entity => (
                                <option key={entity.id} value={String(entity.id)}>
                                  {entity.name} ({entity.type})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={investor.userId}
                              onChange={(e) => {
                                const selectedUser = availableUsers.find(u => u.id === e.target.value)
                                updateInvestor(index, 'userId', e.target.value)
                                updateInvestor(index, 'userEmail', selectedUser?.email || '')
                                updateInvestor(index, 'userName', `${selectedUser?.firstName || ''} ${selectedUser?.lastName || ''}`.trim())
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            >
                              <option value="">Select investor...</option>
                              {availableUsers.map(user => (
                                <option key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName} ({user.email})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Investment Amount
                          </label>
                          <input
                            type="number"
                            value={investor.investmentAmount}
                            onChange={(e) => updateInvestor(index, 'investmentAmount', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0.00"
                            step="0.01"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ownership % of Entity
                          </label>
                          <input
                            type="number"
                            value={investor.ownershipPercentage}
                            onChange={(e) => updateInvestor(index, 'ownershipPercentage', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0.0"
                            step="0.1"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Validation Summary */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Validation Summary</h5>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Total Entity Ownership:</span>
                      <span className="font-medium text-blue-900">{multiInvestorData.entityOwnershipPercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Total Investor Ownership:</span>
                      <span className={`font-medium ${multiInvestorData.investors.reduce((sum, investor) => sum + parseFloat(investor.ownershipPercentage || '0'), 0) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                        {multiInvestorData.investors.reduce((sum, investor) => sum + parseFloat(investor.ownershipPercentage || '0'), 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Total Investment Amount:</span>
                      <span className="font-medium text-blue-900">${parseFloat(multiInvestorData.totalInvestmentAmount || '0').toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Total Investor Amount:</span>
                      <span className={`font-medium ${multiInvestorData.investors.reduce((sum, investor) => sum + parseFloat(investor.investmentAmount || '0'), 0) <= parseFloat(multiInvestorData.totalInvestmentAmount || '0') ? 'text-green-600' : 'text-red-600'}`}>
                        ${multiInvestorData.investors.reduce((sum, investor) => sum + parseFloat(investor.investmentAmount || '0'), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Negative Amounts:</span>
                      <span className={`font-medium ${multiInvestorData.investors.some(investor => parseFloat(investor.investmentAmount || '0') < 0) ? 'text-red-600' : 'text-green-600'}`}>
                        {multiInvestorData.investors.some(investor => parseFloat(investor.investmentAmount || '0') < 0) ? 'Found' : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowMultiInvestorModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors duration-200"
                >
                  Create Multi-Investor Investment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create Entity in Modal */}
      {showCreateEntityInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create New Entity</h3>
              <button
                onClick={() => setShowCreateEntityInModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEntityInModal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Name
                </label>
                <input
                  type="text"
                  value={newEntity.name}
                  onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Type
                </label>
                <select
                  value={newEntity.type}
                  onChange={(e) => setNewEntity({ ...newEntity, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="LLC">LLC</option>
                  <option value="CORPORATION">Corporation</option>
                  <option value="PARTNERSHIP">Partnership</option>
                  <option value="TRUST">Trust</option>
                  <option value="OPERATOR">Operator</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={newEntity.address}
                  onChange={(e) => setNewEntity({ ...newEntity, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID
                </label>
                <input
                  type="text"
                  value={newEntity.taxId}
                  onChange={(e) => setNewEntity({ ...newEntity, taxId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newEntity.contactPerson}
                  onChange={(e) => setNewEntity({ ...newEntity, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={newEntity.contactEmail}
                  onChange={(e) => setNewEntity({ ...newEntity, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={newEntity.contactPhone}
                  onChange={(e) => setNewEntity({ ...newEntity, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateEntityInModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Create Entity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Entity Modal */}
      {showEditEntityModal && editingEntityInvestment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl mx-4 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Entity: {editingEntityInvestment.entity.name}</h3>
              <button
                onClick={() => setShowEditEntityModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateEntityInvestment} className="space-y-4">
              {/* Entity Investment Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Total Investment
                    </label>
                    <input
                      type="number"
                      value={editingEntityInvestment.investmentAmount}
                      onChange={(e) => {
                        const newTotal = e.target.value
                        const updated = {
                          ...editingEntityInvestment,
                          investmentAmount: newTotal,
                          entity: {
                            ...editingEntityInvestment.entity,
                            entityOwners: editingEntityInvestment.entity.entityOwners.map((owner: any) => {
                              // Only recalculate if no breakdown exists
                              if (!owner.showBreakdown || !Array.isArray(owner.breakdown) || owner.breakdown.length === 0) {
                                const ownershipPct = parseFloat(owner.ownershipPercentage || 0)
                                const calculatedAmount = (parseFloat(newTotal || 0) * ownershipPct) / 100
                                return { ...owner, investmentAmount: calculatedAmount }
                              }
                              return owner // Keep existing amount if breakdown exists
                            })
                          }
                        }
                        setEditingEntityInvestment(updated)
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Ownership %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingEntityInvestment.ownershipPercentage}
                      onChange={(e) => setEditingEntityInvestment({
                        ...editingEntityInvestment,
                        ownershipPercentage: e.target.value
                      })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Unified selector: add entity or individual as investor */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Entity or Individual to Add as Investor
                </label>
                <select
                  value={selectedEntityToAdd}
                  onChange={async (e) => {
                    const value = e.target.value
                    if (!value) { setSelectedEntityToAdd(''); return }

                    if (value === 'NEW_INDIVIDUAL') {
                      const newOwner = {
                        id: `temp_${Date.now()}`,
                        userId: '',
                        investorEntityId: '',
                        isEntityInvestor: false,
                        entityName: '',
                        entityOwnersSnapshot: [],
                        user: { firstName: '', lastName: '', email: '' },
                        ownershipPercentage: 0,
                        investmentAmount: 0
                      }
                      setEditingEntityInvestment({
                        ...editingEntityInvestment,
                        entity: {
                          ...editingEntityInvestment.entity,
                          entityOwners: [...(editingEntityInvestment.entity.entityOwners || []), newOwner]
                        }
                      })
                      setSelectedEntityToAdd('')
                      return
                    }

                    const [kind, id] = value.split(':')
                    if (kind === 'user') {
                      const selectedUser = availableUsers.find(u => String(u.id) === id)
                      if (!selectedUser) { setSelectedEntityToAdd(''); return }
                      const newOwner = {
                        id: `temp_${Date.now()}`,
                        userId: String(selectedUser.id),
                        investorEntityId: '',
                        isEntityInvestor: false,
                        entityName: '',
                        entityOwnersSnapshot: [],
                        user: { firstName: selectedUser.firstName, lastName: selectedUser.lastName, email: selectedUser.email },
                        ownershipPercentage: 0,
                        investmentAmount: 0
                      }
                      setEditingEntityInvestment({
                        ...editingEntityInvestment,
                        entity: {
                          ...editingEntityInvestment.entity,
                          entityOwners: [...(editingEntityInvestment.entity.entityOwners || []), newOwner]
                        }
                      })
                      setSelectedEntityToAdd('')
                      return
                    }

                    if (kind === 'entity') {
                      const selectedEntity = availableEntities.find(en => String(en.id) === id)
                      if (!selectedEntity) { setSelectedEntityToAdd(''); return }
                      // Check if entity is already added (either as entity investor or as expanded members)
                      const alreadyAdded = editingEntityInvestment.entity.entityOwners?.some((owner: any) => 
                        String(owner.investorEntityId) === String(id) || 
                        (owner.fromEntity && owner.entityId === String(id))
                      )
                      if (alreadyAdded) { alert('This entity is already added as an investor.'); setSelectedEntityToAdd(''); return }
                      if (!selectedEntity.contactPerson || String(selectedEntity.contactPerson).trim() === '') {
                        setPendingEntitySelectionIndex(editingEntityInvestment.entity.entityOwners?.length || 0)
                        setPendingEntityContact({ id: selectedEntity.id, name: selectedEntity.name, contactPerson: '', contactEmail: '', contactPhone: '' })
                        setShowUpdateEntityContactModal(true)
                        return
                      }
                      
                      // Fetch full entity details to get members
                      try {
                        const entityResponse = await fetch(`/api/investors/entities/${selectedEntity.id}`, {
                          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
                        })
                        const fullEntity = entityResponse.ok ? await entityResponse.json() : selectedEntity
                        
                        // Expand entity members into individual owners
                        const entityMembers = fullEntity.entityOwners || (selectedEntity as any).entityOwners || []
                        const newOwners = entityMembers.map((member: any) => ({
                          id: `temp_${Date.now()}_${member.id || Math.random()}`,
                          userId: member.userId ? String(member.userId) : '',
                          investorEntityId: member.investorEntityId ? String(member.investorEntityId) : '',
                          isEntityInvestor: false,
                          entityName: '',
                          entityOwnersSnapshot: [],
                          user: member.user ? {
                            firstName: member.user.firstName || '',
                            lastName: member.user.lastName || '',
                            email: member.user.email || ''
                          } : (member.investorEntity ? {
                            firstName: '',
                            lastName: '',
                            email: ''
                          } : { firstName: '', lastName: '', email: '' }),
                          ownershipPercentage: parseFloat(member.ownershipPercentage || 0), // Pre-populate from entity
                          investmentAmount: 0, // Will be editable
                          fromEntity: true, // Flag to mark as read-only ownership %
                          entityId: String(selectedEntity.id) // Track which entity this came from
                        }))
                        
                        setEditingEntityInvestment({
                          ...editingEntityInvestment,
                          entity: { 
                            ...editingEntityInvestment.entity, 
                            entityOwners: [...(editingEntityInvestment.entity.entityOwners || []), ...newOwners] 
                          }
                        })
                        setSelectedEntityToAdd('')
                        return
                      } catch (error) {
                        console.error('Error fetching entity details:', error)
                        // Fallback to old behavior if fetch fails
                        const newEntityInvestor = {
                          id: `temp_${Date.now()}`,
                          userId: '',
                          investorEntityId: String(selectedEntity.id),
                          isEntityInvestor: true,
                          entityName: selectedEntity.name,
                          entityOwnersSnapshot: (selectedEntity as any).entityOwners || [],
                          user: { firstName: '', lastName: '', email: '' },
                          ownershipPercentage: 0,
                          investmentAmount: 0
                        }
                        setEditingEntityInvestment({
                          ...editingEntityInvestment,
                          entity: { ...editingEntityInvestment.entity, entityOwners: [...(editingEntityInvestment.entity.entityOwners || []), newEntityInvestor] }
                        })
                        setSelectedEntityToAdd('')
                        return
                      }
                    }

                    setSelectedEntityToAdd('')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an entity or individual to add as investor...</option>
                  <optgroup label="Create New Individual">
                    <option value="NEW_INDIVIDUAL">👤 + New Individual Investor</option>
                  </optgroup>
                  <optgroup label="Existing Individual Investors">
                    {availableUsers.map(user => (
                      <option key={user.id} value={`user:${String(user.id)}`}>
                        {user.firstName} {user.lastName}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Existing Entities">
                    {availableEntities
                      .filter(entity => entity.id !== editingEntityInvestment.entity.id)
                      .map(entity => (
                        <option key={entity.id} value={`entity:${String(entity.id)}`}>
                          🏢 {entity.name}
                        </option>
                      ))}
                  </optgroup>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Select an entity or individual to automatically add them as an investor and view entity members below.
                </p>
              </div>

              {/* Entity Investors */}
              <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Entity Investors</h4>
                  </div>
                  <div className="space-y-4">
                    {editingEntityInvestment.entity.entityOwners && editingEntityInvestment.entity.entityOwners.length > 0 ? (
                      editingEntityInvestment.entity.entityOwners.map((owner: any, index: number) => (
                      <div key={owner.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-700">
                            Investor {index + 1}
                            <span className="ml-2 text-gray-500 font-normal">
                              — {owner.investorEntityId
                                ? (owner.entityName || (availableEntities.find(e => String(e.id) === String(owner.investorEntityId))?.name) || 'Entity')
                                : ((owner.user?.firstName || owner.user?.lastName)
                                    ? `${owner.user?.firstName || ''} ${owner.user?.lastName || ''}`.trim()
                                    : (availableUsers.find(u => String(u.id) === String(owner.userId))
                                        ? `${availableUsers.find(u => String(u.id) === String(owner.userId))!.firstName} ${availableUsers.find(u => String(u.id) === String(owner.userId))!.lastName}`
                                        : 'Individual'))}
                            </span>
                          </h5>
                          <button
                            type="button"
                            onClick={() => removeEntityInvestor(index)}
                            className="p-1 text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {/* Selection of investors is now done via the top unified selector */}
                          
                          {owner.investorEntityId ? (
                            <div className="text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
                              <span className="font-medium">Investing Entity:</span>{' '}
                              {owner.entityName || (availableEntities.find(e => e.id === owner.investorEntityId)?.name) || 'Selected entity'}
                              {Array.isArray(owner.entityOwnersSnapshot) && owner.entityOwnersSnapshot.length > 0 && (
                                <div className="mt-2 text-xs text-gray-600">
                                  <div className="font-semibold mb-1">Members preset in entity:</div>
                                  <ul className="list-disc ml-5 space-y-0.5">
                                    {owner.entityOwnersSnapshot.map((m: any, i: number) => (
                                      <li key={i}>
                                        {(m.user && (m.user.firstName || m.user.lastName)) ? `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim() : (m.investorEntity?.name || 'Entity Member')} — {parseFloat(m.ownershipPercentage || 0).toFixed(1)}%
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = !owner.showBreakdown
                                    updateEntityInvestor(index, 'showBreakdown', next)
                                    if (next && (!owner.breakdown || owner.breakdown.length === 0)) {
                                      const initial = (owner.entityOwnersSnapshot || []).map((m: any) => ({
                                        id: m.user?.id || m.investorEntity?.id || `m-${Math.random().toString(36).slice(2)}`,
                                        label: (m.user && (m.user.firstName || m.user.lastName)) ? `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim() : (m.investorEntity?.name || 'Entity Member'),
                                        amount: 0
                                      }))
                                      updateEntityInvestor(index, 'breakdown', initial)
                                    }
                                  }}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  {owner.showBreakdown ? 'Hide entity investment breakdown' : 'Specify entity investment breakdown'}
                                </button>
                              </div>

                              {owner.showBreakdown && Array.isArray(owner.breakdown) && (
                                <div className="mt-3 rounded border border-blue-200 bg-white p-3">
                                  <div className="text-xs font-semibold text-blue-900 mb-2">Breakdown for this deal</div>
                                  <div className="space-y-2">
                                    {owner.breakdown.map((row: any, bi: number) => (
                                      <div key={row.id || bi} className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-gray-700 flex-1">{row.label}</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={row.amount || 0}
                                          onChange={(e) => {
                                            const amt = parseFloat(e.target.value || '0')
                                            const next = owner.breakdown.map((r: any, i: number) => i === bi ? { ...r, amount: amt } : r)
                                            updateEntityInvestor(index, 'breakdown', next)
                                            // Auto-sync investment amount from breakdown total
                                            const breakdownTotal = next.reduce((sum: number, r: any) => sum + parseFloat(r.amount || 0), 0)
                                            updateEntityInvestor(index, 'investmentAmount', breakdownTotal)
                                          }}
                                          className="w-32 px-2 py-1 text-xs border rounded"
                                          placeholder="0.00"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 text-xs text-gray-700 flex items-center justify-between gap-3">
                                    <span>Breakdown total (auto-synced to investment amount)</span>
                                    <span className="text-green-600 font-medium">
                                      ${owner.breakdown.reduce((s: number, r: any) => s + (parseFloat(r.amount || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-gray-500 mt-1">This breakdown is specific to this deal and does not change entity membership.</div>
                                </div>
                              )}
                            </div>
                          ) : (!owner.userId && !owner.isEntityInvestor) ? (
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="text"
                                placeholder="First Name"
                                value={owner.user?.firstName || ''}
                                onChange={(e) => updateEntityInvestor(index, 'user', { firstName: e.target.value })}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                              />
                              <input
                                type="text"
                                placeholder="Last Name"
                                value={owner.user.lastName || ''}
                                onChange={(e) => updateEntityInvestor(index, 'user', { lastName: e.target.value })}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                              />
                              <input
                                type="email"
                                placeholder="Email"
                                value={owner.user.email || ''}
                                onChange={(e) => updateEntityInvestor(index, 'user', { email: e.target.value })}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          ) : null}
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Investment Amount</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={(() => {
                                  // If breakdown exists, use sum of breakdown (read-only)
                                  if (owner.showBreakdown && Array.isArray(owner.breakdown) && owner.breakdown.length > 0) {
                                    return owner.breakdown.reduce((sum: number, row: any) => sum + parseFloat(row.amount || 0), 0).toFixed(2)
                                  }
                                  // Otherwise use stored investment amount (editable)
                                  return owner.investmentAmount || 0
                                })()}
                                readOnly={owner.showBreakdown && Array.isArray(owner.breakdown) && owner.breakdown.length > 0}
                                onChange={(e) => {
                                  if (!owner.showBreakdown || !Array.isArray(owner.breakdown) || owner.breakdown.length === 0) {
                                    const amt = parseFloat(e.target.value || '0')
                                    updateEntityInvestor(index, 'investmentAmount', amt)
                                  }
                                }}
                                className={`px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 ${owner.showBreakdown && Array.isArray(owner.breakdown) && owner.breakdown.length > 0 ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''}`}
                                title={owner.showBreakdown && Array.isArray(owner.breakdown) && owner.breakdown.length > 0 ? "Investment amount is auto-calculated from breakdown" : "Enter the investment amount for this investor"}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Ownership %</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Ownership %"
                                value={owner.ownershipPercentage || ''}
                                readOnly={owner.fromEntity === true}
                                onChange={(e) => {
                                  if (!owner.fromEntity) {
                                    const newPct = e.target.value
                                    updateEntityInvestor(index, 'ownershipPercentage', newPct)
                                  }
                                }}
                                className={`px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 ${owner.fromEntity === true ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''}`}
                                title={owner.fromEntity === true ? "Ownership percentage comes from the entity and cannot be changed" : "Enter the ownership percentage"}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No investors in this entity yet.</p>
                        <p className="text-sm">Click "Add Investor" to add the first investor.</p>
                      </div>
                    )}
                  </div>
              </div>

              {/* Validation Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Validation Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Total Ownership:</span>
                    <span className={`font-medium ${(editingEntityInvestment.entity.entityOwners || []).reduce((sum: number, owner: any) => sum + parseFloat(owner.ownershipPercentage || 0), 0) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                      {(editingEntityInvestment.entity.entityOwners || []).reduce((sum: number, owner: any) => sum + parseFloat(owner.ownershipPercentage || 0), 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Total Investor Amounts:</span>
                    <span className={`font-medium ${(editingEntityInvestment.entity.entityOwners || []).reduce((sum: number, owner: any) => sum + parseFloat(owner.investmentAmount || 0), 0) <= parseFloat(editingEntityInvestment.investmentAmount || 0) ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency((editingEntityInvestment.entity.entityOwners || []).reduce((sum: number, owner: any) => sum + parseFloat(owner.investmentAmount || 0), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Entity Investment Amount:</span>
                    <span className="font-medium text-blue-900">
                      {formatCurrency(parseFloat(editingEntityInvestment.investmentAmount || 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowEditEntityModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Update Entity Investment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* NOI Calculator Modal */}
      {(((investment as any)?.property as any)?.['dealStatus']) !== 'UNDER_CONSTRUCTION' && showNOIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">NOI Calculator</h3>
              <button
                onClick={() => setShowNOIModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleNOICalculation} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Rent
                  </label>
                  <input
                    type="number"
                    value={noiData.monthlyRent}
                    onChange={(e) => setNoiData({ ...noiData, monthlyRent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Other Income (Monthly)
                  </label>
                  <input
                    type="number"
                    value={noiData.otherIncome}
                    onChange={(e) => setNoiData({ ...noiData, otherIncome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Annual Expenses
                  </label>
                  <input
                    type="number"
                    value={noiData.annualExpenses}
                    onChange={(e) => setNoiData({ ...noiData, annualExpenses: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cap Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={noiData.capRate}
                    onChange={(e) => setNoiData({ ...noiData, capRate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* NOI Calculation Results */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-3">Calculation Results</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Annual Rent:</span>
                    <span className="font-medium text-blue-900">
                      {formatCurrency(parseFloat(noiData.monthlyRent || '0') * 12)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Annual Other Income:</span>
                    <span className="font-medium text-blue-900">
                      {formatCurrency(parseFloat(noiData.otherIncome || '0') * 12)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Annual Revenue:</span>
                    <span className="font-medium text-blue-900">
                      {formatCurrency((parseFloat(noiData.monthlyRent || '0') * 12) + (parseFloat(noiData.otherIncome || '0') * 12))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Annual Expenses:</span>
                    <span className="font-medium text-blue-900">
                      {formatCurrency(parseFloat(noiData.annualExpenses || '0'))}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-2">
                    <span className="text-blue-700 font-medium">NOI:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(((parseFloat(noiData.monthlyRent || '0') * 12) + (parseFloat(noiData.otherIncome || '0') * 12)) - parseFloat(noiData.annualExpenses || '0'))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Estimated Value:</span>
                    <span className="font-bold text-blue-600">
                      {parseFloat(noiData.capRate || '0') > 0 ? 
                        formatCurrency((((parseFloat(noiData.monthlyRent || '0') * 12) + (parseFloat(noiData.otherIncome || '0') * 12)) - parseFloat(noiData.annualExpenses || '0')) / (parseFloat(noiData.capRate || '0') / 100)) : 
                        'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowNOIModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Update NOI Calculations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Insurance Modal */}
      {showInsuranceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Add Insurance Information</h3>
              <button
                onClick={() => setShowInsuranceModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddInsurance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  value={insuranceData.provider}
                  onChange={(e) => setInsuranceData({ ...insuranceData, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Policy Number
                </label>
                <input
                  type="text"
                  value={insuranceData.policyNumber}
                  onChange={(e) => setInsuranceData({ ...insuranceData, policyNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Premium
                </label>
                <input
                  type="number"
                  value={insuranceData.annualPremium}
                  onChange={(e) => setInsuranceData({ ...insuranceData, annualPremium: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coverage Amount
                </label>
                <input
                  type="number"
                  value={insuranceData.coverageAmount}
                  onChange={(e) => setInsuranceData({ ...insuranceData, coverageAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Renewal Date
                </label>
                <input
                  type="date"
                  value={insuranceData.renewalDate}
                  onChange={(e) => setInsuranceData({ ...insuranceData, renewalDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={insuranceData.notes}
                  onChange={(e) => setInsuranceData({ ...insuranceData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInsuranceModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Add Insurance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Modal */}
      {showTaxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Add Tax Information</h3>
              <button
                onClick={() => setShowTaxModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddTax} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Year
                </label>
                <input
                  type="number"
                  value={taxData.taxYear}
                  onChange={(e) => setTaxData({ ...taxData, taxYear: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Property Tax
                </label>
                <input
                  type="number"
                  value={taxData.annualPropertyTax}
                  onChange={(e) => setTaxData({ ...taxData, annualPropertyTax: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={taxData.notes}
                  onChange={(e) => setTaxData({ ...taxData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTaxModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Add Tax Information
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create Waterfall Structure Modal */}
      {showCreateWaterfallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Create Waterfall Structure</h3>
              <button
                onClick={() => setShowCreateWaterfallModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWaterfallStructure} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Structure Name
                  </label>
                  <input
                    type="text"
                    value={waterfallData.name}
                    onChange={(e) => setWaterfallData({ ...waterfallData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={waterfallData.description}
                    onChange={(e) => setWaterfallData({ ...waterfallData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Waterfall Tiers</h4>
                  <button
                    type="button"
                    onClick={addWaterfallTier}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                  >
                    Add Tier
                  </button>
                </div>
                <div className="space-y-4">
                  {waterfallData.tiers.map((tier, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900">Tier {tier.tierNumber}</h5>
                        {waterfallData.tiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeWaterfallTier(index)}
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tier Name
                          </label>
                          <input
                            type="text"
                            value={tier.tierName}
                            onChange={(e) => updateWaterfallTier(index, 'tierName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                            placeholder="e.g., Preferred Return, Catch-Up, Promote"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Descriptive name for this tier (e.g., "8% Preferred Return")
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tier Type
                          </label>
                          <select
                            value={tier.tierType}
                            onChange={(e) => updateWaterfallTier(index, 'tierType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="PREFERRED_RETURN">Preferred Return</option>
                            <option value="CATCH_UP">Catch-Up</option>
                            <option value="PROMOTE">Promote</option>
                            <option value="RESIDUAL">Residual</option>
                            <option value="RETURN_OF_CAPITAL">Return of Capital</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            How this tier distributes funds (affects calculation logic)
                          </p>
                          {tier.tierType === 'PREFERRED_RETURN' && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">
                              Preferred Return: Pays investors a fixed annual return (e.g., 8%) before any other distributions
                            </p>
                          )}
                          {tier.tierType === 'CATCH_UP' && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">
                              Catch-Up: Ensures LPs receive their fair share before GP promote kicks in
                            </p>
                          )}
                          {tier.tierType === 'PROMOTE' && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">
                              Promote: GP's share of profits after LPs receive their preferred return and catch-up
                            </p>
                          )}
                          {tier.tierType === 'RESIDUAL' && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">
                              Residual: Remaining profits distributed based on ownership percentages
                            </p>
                          )}
                          {tier.tierType === 'RETURN_OF_CAPITAL' && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">
                              Return of Capital: Returns original investment amounts to investors
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority
                          </label>
                          <input
                            type="number"
                            value={tier.priority}
                            onChange={(e) => updateWaterfallTier(index, 'priority', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                            placeholder="1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Order of distribution (1 = first, 2 = second, etc.)
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Return Rate (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={tier.returnRate || ''}
                            onChange={(e) => updateWaterfallTier(index, 'returnRate', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="8.0"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Annual return rate for preferred return tiers (e.g., 8.0 = 8%)
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Catch-Up (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={tier.catchUpPercentage || ''}
                            onChange={(e) => updateWaterfallTier(index, 'catchUpPercentage', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="80.0"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Percentage of profits to LP before GP promote (e.g., 80.0 = 80%)
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Promote (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={tier.promotePercentage || ''}
                            onChange={(e) => updateWaterfallTier(index, 'promotePercentage', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="20.0"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Percentage of profits to GP after catch-up (e.g., 20.0 = 20%)
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateWaterfallModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Create Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Process Distribution Modal (admins/managers only) */}
      {showWaterfallModal && (currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto pt-8 pb-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Process Distribution</h3>
              <button
                onClick={() => setShowWaterfallModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleProcessDistribution} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Waterfall Structure
                </label>
                <select
                  value={distributionData.waterfallStructureId}
                  onChange={(e) => setDistributionData({ ...distributionData, waterfallStructureId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a structure</option>
                  <optgroup label="Local Structures">
                    {waterfallStructures.map((structure: any) => (
                      <option key={structure.id} value={structure.id}>
                        {structure.name} ({structure.waterfallTiers.length} tiers)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Global Structures (Auto-Copy)">
                    {globalWaterfallStructures.map((structure: any) => (
                      <option key={structure.id} value={structure.id}>
                        {structure.name} ({structure.waterfallTiers.length} tiers) - Global (will be copied automatically)
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose the waterfall structure that defines how this distribution will be split among investors
                </p>
              </div>
              {/* Total Amount - Greyed out (readOnly) when refinance, but still visible */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={distributionData.totalAmount}
                  onChange={(e) => setDistributionData({ ...distributionData, totalAmount: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${distributionData.distributionType === 'REFINANCE' ? 'bg-gray-100 text-gray-500' : ''}`}
                  required
                  readOnly={distributionData.distributionType === 'REFINANCE'}
                  placeholder="0.00"
                />
                  <p className="text-xs text-gray-500 mt-1">
                    {distributionData.distributionType === 'REFINANCE'
                      ? 'Calculated distribution amount after subtracting old debt and all fees from refinance amount'
                      : 'The total amount to be distributed (e.g., $50,000 in rental income)'}
                  </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distribution Date
                </label>
                <input
                  type="date"
                  value={distributionData.distributionDate}
                  onChange={(e) => setDistributionData({ ...distributionData, distributionDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  When this distribution will be paid to investors
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distribution Type
                </label>
                <select
                  value={distributionData.distributionType}
                  onChange={(e) => setDistributionData({ ...distributionData, distributionType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="RENTAL_INCOME">Rental Income</option>
                  <option value="SALE_PROCEEDS">Sale Proceeds</option>
                  <option value="REFINANCE">Refinance</option>
                  <option value="INSURANCE_SETTLEMENT">Insurance Settlement</option>
                  <option value="RETURN_OF_CAPITAL">Return of Capital</option>
                  <option value="PREFERRED_RETURN">Preferred Return</option>
                  <option value="PROMOTE">Promote</option>
                  <option value="OTHER">Other</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  The source of funds being distributed (affects waterfall calculations)
                </p>
              </div>

              {/* Refinance Fields - Only show when REFINANCE is selected */}
              {distributionData.distributionType === 'REFINANCE' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">Refinance Details</h4>
                  <div className="p-3 bg-blue-100 rounded-lg border border-blue-300 mb-4">
                    <p className="text-xs text-blue-800 font-medium">
                      💡 <strong>How it works:</strong> Enter the refinance amount and fees. The system will:
                    </p>
                    <ul className="text-xs text-blue-700 mt-2 ml-4 list-disc">
                      <li>Set the new debt amount to the refinance amount</li>
                      <li>Calculate distribution as: Refinance Amount - Previous Debt - All Fees</li>
                      <li>Distribute the remaining amount to investors</li>
                    </ul>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Refinance Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={distributionData.refinanceAmount}
                      onChange={(e) => {
                        const refinanceAmount = parseFloat(e.target.value) || 0
                        const originationFees = parseFloat(distributionData.originationFees) || 0
                        const closingFees = parseFloat(distributionData.closingFees) || 0
                        const prepaymentPenalty = parseFloat(distributionData.prepaymentPenalty) || 0
                        
                        // Get current debt amount from the investment's property
                        const currentDebtAmount = investment?.property?.debtAmount || 0
                        
                        // Calculate distribution amount: Refinance Amount - Previous Debt - All Fees
                        const distributionAmount = refinanceAmount - currentDebtAmount - originationFees - closingFees - prepaymentPenalty
                        
                        setDistributionData({ 
                          ...distributionData, 
                          refinanceAmount: e.target.value,
                          newDebtAmount: e.target.value, // New debt becomes the refinance amount
                          totalAmount: distributionAmount.toString() // Use calculated distribution amount
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Total refinance amount (this becomes the new debt amount)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Origination Fees ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={distributionData.originationFees}
                      onChange={(e) => {
                        const refinanceAmount = parseFloat(distributionData.refinanceAmount) || 0
                        const originationFees = parseFloat(e.target.value) || 0
                        const closingFees = parseFloat(distributionData.closingFees) || 0
                        const prepaymentPenalty = parseFloat(distributionData.prepaymentPenalty) || 0
                        
                        // Get current debt amount from the investment's property
                        const currentDebtAmount = investment?.property?.debtAmount || 0
                        
                        // Calculate distribution amount: Refinance Amount - Previous Debt - All Fees
                        const distributionAmount = refinanceAmount - currentDebtAmount - originationFees - closingFees - prepaymentPenalty
                        
                        setDistributionData({ 
                          ...distributionData, 
                          originationFees: e.target.value,
                          totalAmount: distributionAmount.toString() // Use calculated distribution amount
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Loan origination fees (typically 1-2% of loan amount)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Closing Fees
                    </label>
                    <div className="space-y-2">
                      {distributionData.closingFeesItems.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                          <input
                            type="text"
                            className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Category (e.g., Title, Appraisal)"
                            value={item.category}
                            onChange={(e) => {
                              const items = [...distributionData.closingFeesItems]
                              items[idx] = { ...items[idx], category: e.target.value }
                              setDistributionData({ ...distributionData, closingFeesItems: items })
                            }}
                          />
                          <input
                            type="number"
                            step="0.01"
                            className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Amount"
                            value={item.amount}
                            onChange={(e) => {
                              const items = [...distributionData.closingFeesItems]
                              items[idx] = { ...items[idx], amount: e.target.value }
                              // Recalculate totals
                              const refinanceAmount = parseFloat(distributionData.refinanceAmount) || 0
                              const originationFees = parseFloat(distributionData.originationFees) || 0
                              const prepaymentPenalty = parseFloat(distributionData.prepaymentPenalty) || 0
                              const closingFeesSum = items.reduce((s, it) => s + (parseFloat(it.amount || '0') || 0), 0)
                              const currentDebtAmount = investment?.property?.debtAmount || 0
                              const distributionAmount = refinanceAmount - currentDebtAmount - originationFees - closingFeesSum - prepaymentPenalty
                              setDistributionData({ ...distributionData, closingFeesItems: items, closingFees: closingFeesSum.toString(), totalAmount: distributionAmount.toString() })
                            }}
                          />
                          <button type="button" className="col-span-1 text-red-600 hover:text-red-800" onClick={() => {
                            const items = distributionData.closingFeesItems.filter((_, i) => i !== idx)
                            const refinanceAmount = parseFloat(distributionData.refinanceAmount) || 0
                            const originationFees = parseFloat(distributionData.originationFees) || 0
                            const prepaymentPenalty = parseFloat(distributionData.prepaymentPenalty) || 0
                            const closingFeesSum = items.reduce((s, it) => s + (parseFloat(it.amount || '0') || 0), 0)
                            const currentDebtAmount = investment?.property?.debtAmount || 0
                            const distributionAmount = refinanceAmount - currentDebtAmount - originationFees - closingFeesSum - prepaymentPenalty
                            setDistributionData({ ...distributionData, closingFeesItems: items, closingFees: closingFeesSum.toString(), totalAmount: distributionAmount.toString() })
                          }}>
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex justify-between items-center">
                        <button type="button" className="text-blue-600 hover:text-blue-800 text-sm" onClick={() => setDistributionData({ ...distributionData, closingFeesItems: [...distributionData.closingFeesItems, { category: '', amount: '' }] })}>+ Add Closing Fee</button>
                        <div className="text-sm text-gray-700">Total: ${parseFloat(distributionData.closingFees || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Add one or more closing fee line items with categories.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prepayment Penalty ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={distributionData.prepaymentPenalty}
                      onChange={(e) => {
                        const refinanceAmount = parseFloat(distributionData.refinanceAmount) || 0
                        const originationFees = parseFloat(distributionData.originationFees) || 0
                        const closingFees = parseFloat(distributionData.closingFees) || 0
                        const prepaymentPenalty = parseFloat(e.target.value) || 0
                        
                        // Get current debt amount from the investment's property
                        const currentDebtAmount = investment?.property?.debtAmount || 0
                        
                        // Calculate distribution amount: Refinance Amount - Previous Debt - All Fees
                        const distributionAmount = refinanceAmount - currentDebtAmount - originationFees - closingFees - prepaymentPenalty
                        
                        setDistributionData({ 
                          ...distributionData, 
                          prepaymentPenalty: e.target.value,
                          totalAmount: distributionAmount.toString() // Use calculated distribution amount
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Prepayment penalty on old loan
                    </p>
                  </div>

                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800">Distribution Amount:</span>
                      <span className="text-lg font-bold text-green-800">
                        ${parseFloat(distributionData.totalAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Refinance Amount - Previous Debt - Origination Fees - Closing Fees - Prepayment Penalty
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={distributionData.description}
                  onChange={(e) => setDistributionData({ ...distributionData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Optional notes about this distribution"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Additional details about this distribution (optional)
                </p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWaterfallModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors duration-200"
                >
                  Process Distribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Distribution Modal */}
      {showEditDistributionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Edit Distribution</h3>
              <button
                onClick={() => setShowEditDistributionModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Edit Distribution:</strong> Update the details of this distribution. 
                Note: Changing the amount will recalculate the waterfall distribution.
              </p>
            </div>
            <form onSubmit={handleUpdateDistribution} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={distributionData.totalAmount}
                  onChange={(e) => setDistributionData({ ...distributionData, totalAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The total amount to be distributed (e.g., $50,000 in rental income)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distribution Date
                </label>
                <input
                  type="date"
                  value={distributionData.distributionDate}
                  onChange={(e) => setDistributionData({ ...distributionData, distributionDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  When this distribution will be paid to investors
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distribution Type
                </label>
                <select
                  value={distributionData.distributionType}
                  onChange={(e) => setDistributionData({ ...distributionData, distributionType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="RENTAL_INCOME">Rental Income</option>
                  <option value="SALE_PROCEEDS">Sale Proceeds</option>
                  <option value="REFINANCE">Refinance</option>
                  <option value="INSURANCE_SETTLEMENT">Insurance Settlement</option>
                  <option value="RETURN_OF_CAPITAL">Return of Capital</option>
                  <option value="PREFERRED_RETURN">Preferred Return</option>
                  <option value="PROMOTE">Promote</option>
                  <option value="OTHER">Other</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  The source of funds being distributed (affects waterfall calculations)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={distributionData.description}
                  onChange={(e) => setDistributionData({ ...distributionData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Optional notes about this distribution"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Additional details about this distribution (optional)
                </p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditDistributionModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Update Distribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create Global Waterfall Structure Modal */}
      {showCreateGlobalWaterfallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Create Global Waterfall Structure</h3>
              <button
                onClick={() => setShowCreateGlobalWaterfallModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-800">
                <strong>Global Structure:</strong> This structure can be applied to any entity investment. 
                It will be copied and customized for each entity it's applied to.
              </p>
            </div>
            <form onSubmit={handleCreateGlobalWaterfallStructure} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Structure Name
                  </label>
                  <input
                    type="text"
                    value={waterfallData.name}
                    onChange={(e) => setWaterfallData({ ...waterfallData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={waterfallData.description}
                    onChange={(e) => setWaterfallData({ ...waterfallData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Waterfall Tiers</h4>
                  <button
                    type="button"
                    onClick={addWaterfallTier}
                    className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors duration-200"
                  >
                    Add Tier
                  </button>
                </div>
                <div className="space-y-4">
                  {waterfallData.tiers.map((tier, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900">Tier {tier.tierNumber}</h5>
                        {waterfallData.tiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeWaterfallTier(index)}
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tier Name
                          </label>
                          <input
                            type="text"
                            value={tier.tierName}
                            onChange={(e) => updateWaterfallTier(index, 'tierName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tier Type
                          </label>
                          <select
                            value={tier.tierType}
                            onChange={(e) => updateWaterfallTier(index, 'tierType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="PREFERRED_RETURN">Preferred Return</option>
                            <option value="CATCH_UP">Catch-Up</option>
                            <option value="PROMOTE">Promote</option>
                            <option value="RESIDUAL">Residual</option>
                            <option value="RETURN_OF_CAPITAL">Return of Capital</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            {tier.tierType === 'PREFERRED_RETURN' && 'Guaranteed return to investors before profits are split'}
                            {tier.tierType === 'CATCH_UP' && 'Allows GP to catch up to their promote percentage'}
                            {tier.tierType === 'PROMOTE' && 'GP share of profits after preferred return and catch-up'}
                            {tier.tierType === 'RESIDUAL' && 'Remaining profits split based on ownership percentages'}
                            {tier.tierType === 'RETURN_OF_CAPITAL' && 'Return of original invested capital to investors'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority
                          </label>
                          <input
                            type="number"
                            value={tier.priority}
                            onChange={(e) => updateWaterfallTier(index, 'priority', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                      </div>
                      {(tier.tierType === 'PREFERRED_RETURN' || tier.tierType === 'CATCH_UP' || tier.tierType === 'PROMOTE') && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          {tier.tierType === 'PREFERRED_RETURN' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Return Rate (%)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={tier.returnRate || ''}
                                onChange={(e) => updateWaterfallTier(index, 'returnRate', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          )}
                          {tier.tierType === 'CATCH_UP' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Catch-Up Percentage (%)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={tier.catchUpPercentage || ''}
                                onChange={(e) => updateWaterfallTier(index, 'catchUpPercentage', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          )}
                          {tier.tierType === 'PROMOTE' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Promote Percentage (%)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={tier.promotePercentage || ''}
                                onChange={(e) => updateWaterfallTier(index, 'promotePercentage', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateGlobalWaterfallModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors duration-200"
                >
                  Create Global Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Waterfall Structure Modal */}
      {showApplyWaterfallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Apply Waterfall Structure</h3>
              <button
                onClick={() => setShowApplyWaterfallModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-800">
                <strong>Apply Structure:</strong> Select a global waterfall structure to apply to an entity investment. 
                This will create a copy of the structure specific to that entity.
              </p>
            </div>
            <form onSubmit={handleApplyWaterfallStructure} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Global Waterfall Structure
                </label>
                <select
                  value={applyWaterfallData.waterfallStructureId}
                  onChange={(e) => setApplyWaterfallData({ ...applyWaterfallData, waterfallStructureId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a global structure</option>
                  {globalWaterfallStructures.map((structure: any) => (
                    <option key={structure.id} value={structure.id}>
                      {structure.name} ({structure.waterfallTiers.length} tiers)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Investment
                </label>
                <select
                  value={applyWaterfallData.entityInvestmentId}
                  onChange={(e) => setApplyWaterfallData({ ...applyWaterfallData, entityInvestmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select an entity investment</option>
                  {propertyEntityInvestments.map((entityInvestment: any) => (
                    <option key={entityInvestment.id} value={entityInvestment.id}>
                      {entityInvestment.entity.name} - {formatCurrency(entityInvestment.investmentAmount)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowApplyWaterfallModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg transition-colors duration-200"
                >
                  Apply Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Waterfall Structure Modal */}
      {showEditWaterfallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Edit Waterfall Structure</h3>
              <button
                onClick={() => setShowEditWaterfallModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Edit Structure:</strong> Modify the waterfall structure for this property. 
                Changes will affect all future distributions using this structure.
              </p>
            </div>
            <form onSubmit={handleUpdateWaterfallStructure} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Structure Name
                  </label>
                  <input
                    type="text"
                    value={waterfallData.name}
                    onChange={(e) => setWaterfallData({ ...waterfallData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={waterfallData.description}
                    onChange={(e) => setWaterfallData({ ...waterfallData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Waterfall Tiers</h4>
                  <button
                    type="button"
                    onClick={addWaterfallTier}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                  >
                    Add Tier
                  </button>
                </div>
                <div className="space-y-4">
                  {waterfallData.tiers.map((tier, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900">Tier {tier.tierNumber}</h5>
                        {waterfallData.tiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeWaterfallTier(index)}
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tier Name
                          </label>
                          <input
                            type="text"
                            value={tier.tierName}
                            onChange={(e) => updateWaterfallTier(index, 'tierName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tier Type
                          </label>
                          <select
                            value={tier.tierType}
                            onChange={(e) => updateWaterfallTier(index, 'tierType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="PREFERRED_RETURN">Preferred Return</option>
                            <option value="CATCH_UP">Catch-Up</option>
                            <option value="PROMOTE">Promote</option>
                            <option value="RESIDUAL">Residual</option>
                            <option value="RETURN_OF_CAPITAL">Return of Capital</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            {tier.tierType === 'PREFERRED_RETURN' && 'Guaranteed return to investors before profits are split'}
                            {tier.tierType === 'CATCH_UP' && 'Allows GP to catch up to their promote percentage'}
                            {tier.tierType === 'PROMOTE' && 'GP share of profits after preferred return and catch-up'}
                            {tier.tierType === 'RESIDUAL' && 'Remaining profits split based on ownership percentages'}
                            {tier.tierType === 'RETURN_OF_CAPITAL' && 'Return of original invested capital to investors'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority
                          </label>
                          <input
                            type="number"
                            value={tier.priority}
                            onChange={(e) => updateWaterfallTier(index, 'priority', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                            min="1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        {/* Return Rate - Only for PREFERRED_RETURN */}
                        {tier.tierType === 'PREFERRED_RETURN' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Return Rate (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={tier.returnRate || ''}
                              onChange={(e) => updateWaterfallTier(index, 'returnRate', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="8.0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Annual preferred return rate (e.g., 8% = 8.0)
                            </p>
                          </div>
                        )}

                        {/* Catch-Up Percentage - Only for CATCH_UP */}
                        {tier.tierType === 'CATCH_UP' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Catch-Up Percentage (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={tier.catchUpPercentage || ''}
                              onChange={(e) => updateWaterfallTier(index, 'catchUpPercentage', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="80.0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Percentage of profits GP receives during catch-up (e.g., 80% = 80.0)
                            </p>
                          </div>
                        )}

                        {/* Promote Percentage - Only for PROMOTE */}
                        {tier.tierType === 'PROMOTE' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Promote Percentage (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={tier.promotePercentage || ''}
                              onChange={(e) => updateWaterfallTier(index, 'promotePercentage', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="20.0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              GP's promote percentage of profits (e.g., 20% = 20.0)
                            </p>
                          </div>
                        )}

                        {/* No additional fields for RESIDUAL and RETURN_OF_CAPITAL */}
                        {(tier.tierType === 'RESIDUAL' || tier.tierType === 'RETURN_OF_CAPITAL') && (
                          <div className="col-span-3">
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-600">
                                {tier.tierType === 'RESIDUAL' 
                                  ? 'Residual profits are split based on ownership percentages. No additional configuration needed.'
                                  : 'Return of capital distributes original invested amounts. No additional configuration needed.'
                                }
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col space-y-3 pt-6">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditWaterfallModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                  >
                    Update Structure
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    console.log('Delete button clicked, editingWaterfallStructure:', editingWaterfallStructure)
                    if (!editingWaterfallStructure || !editingWaterfallStructure.id) {
                      alert('Error: No waterfall structure selected for deletion')
                      return
                    }
                    if (confirm('Are you sure you want to delete this waterfall structure? This action cannot be undone.')) {
                      console.log('Deleting waterfall structure with ID:', editingWaterfallStructure.id)
                      handleDeleteWaterfallStructure(editingWaterfallStructure.id)
                      setShowEditWaterfallModal(false)
                    }
                  }}
                  className="w-full px-4 py-3 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors duration-200 font-medium"
                >
                  🗑️ Delete Waterfall Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Global Waterfall Structure Modal */}
      {showEditGlobalWaterfallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Edit Global Waterfall Structure</h3>
              <button
                onClick={() => setShowEditGlobalWaterfallModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-800">
                <strong>Edit Global Structure:</strong> Modify the global waterfall structure. 
                Changes will affect all entity investments that use this structure.
              </p>
            </div>
            <form onSubmit={handleUpdateGlobalWaterfallStructure} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Structure Name
                  </label>
                  <input
                    type="text"
                    value={waterfallData.name}
                    onChange={(e) => setWaterfallData({ ...waterfallData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={waterfallData.description}
                    onChange={(e) => setWaterfallData({ ...waterfallData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Waterfall Tiers</h4>
                  <button
                    type="button"
                    onClick={addWaterfallTier}
                    className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors duration-200"
                  >
                    Add Tier
                  </button>
                </div>
                <div className="space-y-4">
                  {waterfallData.tiers.map((tier, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900">Tier {tier.tierNumber}</h5>
                        {waterfallData.tiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeWaterfallTier(index)}
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tier Name
                          </label>
                          <input
                            type="text"
                            value={tier.tierName}
                            onChange={(e) => updateWaterfallTier(index, 'tierName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tier Type
                          </label>
                          <select
                            value={tier.tierType}
                            onChange={(e) => updateWaterfallTier(index, 'tierType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="PREFERRED_RETURN">Preferred Return</option>
                            <option value="CATCH_UP">Catch-Up</option>
                            <option value="PROMOTE">Promote</option>
                            <option value="RESIDUAL">Residual</option>
                            <option value="RETURN_OF_CAPITAL">Return of Capital</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            {tier.tierType === 'PREFERRED_RETURN' && 'Guaranteed return to investors before profits are split'}
                            {tier.tierType === 'CATCH_UP' && 'Allows GP to catch up to their promote percentage'}
                            {tier.tierType === 'PROMOTE' && 'GP share of profits after preferred return and catch-up'}
                            {tier.tierType === 'RESIDUAL' && 'Remaining profits split based on ownership percentages'}
                            {tier.tierType === 'RETURN_OF_CAPITAL' && 'Return of original invested capital to investors'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority
                          </label>
                          <input
                            type="number"
                            value={tier.priority}
                            onChange={(e) => updateWaterfallTier(index, 'priority', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                            min="1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        {/* Return Rate - Only for PREFERRED_RETURN */}
                        {tier.tierType === 'PREFERRED_RETURN' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Return Rate (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={tier.returnRate || ''}
                              onChange={(e) => updateWaterfallTier(index, 'returnRate', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="8.0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Annual preferred return rate (e.g., 8% = 8.0)
                            </p>
                          </div>
                        )}

                        {/* Catch-Up Percentage - Only for CATCH_UP */}
                        {tier.tierType === 'CATCH_UP' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Catch-Up Percentage (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={tier.catchUpPercentage || ''}
                              onChange={(e) => updateWaterfallTier(index, 'catchUpPercentage', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="80.0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Percentage of profits GP receives during catch-up (e.g., 80% = 80.0)
                            </p>
                          </div>
                        )}

                        {/* Promote Percentage - Only for PROMOTE */}
                        {tier.tierType === 'PROMOTE' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Promote Percentage (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={tier.promotePercentage || ''}
                              onChange={(e) => updateWaterfallTier(index, 'promotePercentage', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="20.0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              GP's promote percentage of profits (e.g., 20% = 20.0)
                            </p>
                          </div>
                        )}

                        {/* No additional fields for RESIDUAL and RETURN_OF_CAPITAL */}
                        {(tier.tierType === 'RESIDUAL' || tier.tierType === 'RETURN_OF_CAPITAL') && (
                          <div className="col-span-3">
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-600">
                                {tier.tierType === 'RESIDUAL' 
                                  ? 'Residual profits are split based on ownership percentages. No additional configuration needed.'
                                  : 'Return of capital distributes original invested amounts. No additional configuration needed.'
                                }
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowEditGlobalWaterfallModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this global waterfall structure? This action cannot be undone.')) {
                      handleDeleteWaterfallStructure(editingWaterfallStructure.id)
                      setShowEditGlobalWaterfallModal(false)
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors duration-200"
                >
                  Delete Structure
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors duration-200"
                >
                  Update Global Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Document Modal */}
      {showEditDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Edit Document</h3>
              <button
                onClick={() => setShowEditDocumentModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateDocument} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title
                </label>
                <input
                  type="text"
                  value={editDocumentData.title}
                  onChange={(e) => setEditDocumentData({ ...editDocumentData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editDocumentData.description}
                  onChange={(e) => setEditDocumentData({ ...editDocumentData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={editDocumentData.documentType}
                  onChange={(e) => setEditDocumentData({ ...editDocumentData, documentType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select document type</option>
                  <option value="OFFERING_MEMORANDUM">Offering Memorandum</option>
                  <option value="OPERATING_AGREEMENT">Operating Agreement</option>
                  <option value="PPM">PPM</option>
                  <option value="FINANCIAL_STATEMENT">Financial Statement</option>
                  <option value="TAX_DOCUMENT">Tax Document</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="TITLE_REPORT">Title Report</option>
                  <option value="APPRAISAL">Appraisal</option>
                  <option value="ENVIRONMENTAL_REPORT">Environmental Report</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Visibility
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editDocumentData.visibleToAdmin}
                      onChange={(e) => setEditDocumentData({ ...editDocumentData, visibleToAdmin: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Visible to Administrators</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editDocumentData.visibleToManager}
                      onChange={(e) => setEditDocumentData({ ...editDocumentData, visibleToManager: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Visible to Managers</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editDocumentData.visibleToInvestor}
                      onChange={(e) => setEditDocumentData({ ...editDocumentData, visibleToInvestor: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Visible to Investors</span>
                  </label>
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditDocumentModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Update Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Distribution Breakdown Modal */}
      {showBreakdownModal && breakdownData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Distribution Breakdown</h3>
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Summary Section */}
              {breakdownData.detailedBreakdown?.summary && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-blue-900 mb-3">💰 Financial Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-blue-700">Total Distributed</p>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(breakdownData.detailedBreakdown.summary.totalDistributed)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Tiers Processed</p>
                      <p className="text-lg font-bold text-blue-900">{breakdownData.detailedBreakdown.summary.tiersProcessed}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Individual Investors</p>
                      <p className="text-lg font-bold text-blue-900">{breakdownData.detailedBreakdown.summary.totalInvestors}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Entities</p>
                      <p className="text-lg font-bold text-blue-900">{breakdownData.detailedBreakdown.summary.totalEntities}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tiers Breakdown */}
              {breakdownData.detailedBreakdown?.byTier && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">🏗️ Tier Breakdown</h4>
                  {Object.entries(breakdownData.detailedBreakdown.byTier).map(([tierName, tierData]: [string, any]) => (
                    <div key={tierName} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-md font-semibold text-gray-900">{tierName}</h5>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{tierData.tierType}</p>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(tierData.totalAmount)}</p>
                        </div>
                      </div>
                      
                      {/* Individual Investors */}
                      {tierData.investors && tierData.investors.length > 0 && (
                        <div className="mb-3">
                          <h6 className="text-sm font-medium text-gray-700 mb-2">👤 Individual Investors</h6>
                          <div className="space-y-2">
                            {tierData.investors.map((investor: any, index: number) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{investor.name}</p>
                                  {investor.email && <p className="text-xs text-gray-600">{investor.email}</p>}
                                </div>
                                <p className="text-sm font-semibold text-green-600">{formatCurrency(investor.amount)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Entities */}
                      {tierData.entities && tierData.entities.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium text-gray-700 mb-2">🏢 Entities</h6>
                          <div className="space-y-2">
                            {tierData.entities.map((entity: any, index: number) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{entity.name}</p>
                                  <p className="text-xs text-gray-600">{entity.ownershipPercentage}% ownership</p>
                                </div>
                                <p className="text-sm font-semibold text-green-600">{formatCurrency(entity.amount)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 