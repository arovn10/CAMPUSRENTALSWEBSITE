'use client'

import { useState, useEffect } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BanknotesIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface Loan {
  id: string
  lenderName: string
  accountNumber?: string | null
  originalAmount: number
  currentBalance: number
  interestRate?: number | null
  loanDate?: string | null
  maturityDate?: string | null
  monthlyPayment?: number | null
  loanType?: string | null
  notes?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface PropertyLoansManagerProps {
  propertyId: string
  authToken: string
  readOnly?: boolean
}

export default function PropertyLoansManager({ propertyId, authToken, readOnly = false }: PropertyLoansManagerProps) {
  const [loans, setLoans] = useState<Loan[]>([])
  const [totals, setTotals] = useState({
    totalCurrentDebt: 0,
    totalOriginalAmount: 0,
    loanCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [deletingLoan, setDeletingLoan] = useState<Loan | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    lenderName: '',
    accountNumber: '',
    originalAmount: '',
    currentBalance: '',
    interestRate: '',
    loanDate: '',
    maturityDate: '',
    monthlyPayment: '',
    loanType: '',
    notes: '',
    isActive: true
  })

  useEffect(() => {
    fetchLoans()
  }, [propertyId])

  const fetchLoans = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/properties/${propertyId}/loans`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLoans(data.loans || [])
        setTotals(data.totals || { totalCurrentDebt: 0, totalOriginalAmount: 0, loanCount: 0 })
      } else {
        console.error('Failed to fetch loans')
      }
    } catch (error) {
      console.error('Error fetching loans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddLoan = () => {
    if (readOnly) return
    setEditingLoan(null)
    setFormData({
      lenderName: '',
      accountNumber: '',
      originalAmount: '',
      currentBalance: '',
      interestRate: '',
      loanDate: '',
      maturityDate: '',
      monthlyPayment: '',
      loanType: '',
      notes: '',
      isActive: true
    })
    setShowAddModal(true)
  }

  const handleEditLoan = (loan: Loan) => {
    setEditingLoan(loan)
    setFormData({
      lenderName: loan.lenderName,
      accountNumber: loan.accountNumber || '',
      originalAmount: loan.originalAmount.toString(),
      currentBalance: loan.currentBalance.toString(),
      interestRate: loan.interestRate?.toString() || '',
      loanDate: loan.loanDate ? new Date(loan.loanDate).toISOString().split('T')[0] : '',
      maturityDate: loan.maturityDate ? new Date(loan.maturityDate).toISOString().split('T')[0] : '',
      monthlyPayment: loan.monthlyPayment?.toString() || '',
      loanType: loan.loanType || '',
      notes: loan.notes || '',
      isActive: loan.isActive
    })
    setShowAddModal(true)
  }

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingLoan
        ? `/api/properties/${propertyId}/loans/${editingLoan.id}`
        : `/api/properties/${propertyId}/loans`

      const method = editingLoan ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchLoans()
        setShowAddModal(false)
        setEditingLoan(null)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to save loan'}`)
      }
    } catch (error) {
      console.error('Error saving loan:', error)
      alert('Failed to save loan')
    }
  }

  const handleDeleteLoan = async () => {
    if (!deletingLoan) return

    if (!confirm(`Are you sure you want to delete the loan from ${deletingLoan.lenderName}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/properties/${propertyId}/loans/${deletingLoan.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        await fetchLoans()
        setDeletingLoan(null)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to delete loan'}`)
      }
    } catch (error) {
      console.error('Error deleting loan:', error)
      alert('Failed to delete loan')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <BanknotesIcon className="h-6 w-6 mr-2 text-blue-600" />
            Property Loans
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage all loans associated with this property
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={handleAddLoan}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Loan
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Original Loans</p>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(totals.totalOriginalAmount)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Current Debt</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(totals.totalCurrentDebt)}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">Active Loans</p>
          <p className="text-2xl font-bold text-purple-900">{totals.loanCount}</p>
        </div>
      </div>

      {/* Loans List */}
      {loans.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <BanknotesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No loans found</p>
          {!readOnly && (
            <p className="text-sm text-gray-500 mt-1">Click "Add Loan" to get started</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className={`border rounded-lg p-5 ${loan.isActive ? 'border-gray-200 bg-white' : 'border-gray-300 bg-gray-50 opacity-75'}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">{loan.lenderName}</h4>
                    {loan.accountNumber && (
                      <span className="text-sm text-gray-500">Account: {loan.accountNumber}</span>
                    )}
                    {!loan.isActive && (
                      <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">Inactive</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Original Amount</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(loan.originalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Current Balance</p>
                      <p className="text-sm font-semibold text-blue-600">{formatCurrency(loan.currentBalance)}</p>
                    </div>
                    {loan.monthlyPayment && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Monthly Payment</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(loan.monthlyPayment)}</p>
                      </div>
                    )}
                    {loan.interestRate && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Interest Rate</p>
                        <p className="text-sm font-semibold text-gray-900">{loan.interestRate}%</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    {loan.loanDate && (
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>Originated: {formatDate(loan.loanDate)}</span>
                      </div>
                    )}
                    {loan.maturityDate && (
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>Matures: {formatDate(loan.maturityDate)}</span>
                      </div>
                    )}
                    {loan.loanType && (
                      <div className="flex items-center">
                        <InformationCircleIcon className="h-4 w-4 mr-1" />
                        <span>{loan.loanType}</span>
                      </div>
                    )}
                  </div>

                  {loan.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Notes:</p>
                      <p className="text-sm text-gray-700">{loan.notes}</p>
                    </div>
                  )}
                </div>

                {!readOnly && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEditLoan(loan)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit loan"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setDeletingLoan(loan)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete loan"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingLoan ? 'Edit Loan' : 'Add New Loan'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {editingLoan
                  ? 'Update the loan information below'
                  : 'Fill in the loan details to add a new loan for this property'}
              </p>
            </div>

            <form onSubmit={handleSaveLoan} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lender Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.lenderName}
                    onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
                    placeholder="e.g., Metairie Bank"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="e.g., 7058931"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Original Loan Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.originalAmount}
                    onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Balance <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.currentBalance}
                    onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    placeholder="e.g., 5.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Payment
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.monthlyPayment}
                    onChange={(e) => setFormData({ ...formData, monthlyPayment: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loan Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.loanDate}
                    onChange={(e) => setFormData({ ...formData, loanDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maturity Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.maturityDate}
                    onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loan Type
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.loanType}
                    onChange={(e) => setFormData({ ...formData, loanType: e.target.value })}
                  >
                    <option value="">Select type...</option>
                    <option value="Mortgage">Mortgage</option>
                    <option value="Construction Loan">Construction Loan</option>
                    <option value="Line of Credit">Line of Credit</option>
                    <option value="Bridge Loan">Bridge Loan</option>
                    <option value="Commercial Loan">Commercial Loan</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this loan..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingLoan(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingLoan ? 'Update Loan' : 'Add Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Loan</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete the loan from <strong>{deletingLoan.lenderName}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeletingLoan(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteLoan}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete Loan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

