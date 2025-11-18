# Testing Checklist for Loan Management System

## ✅ Completed Setup

- [x] PropertyLoan model added to Prisma schema
- [x] Database schema synced (`npx prisma db push` completed)
- [x] API endpoints created:
  - [x] GET /api/properties/[id]/loans
  - [x] POST /api/properties/[id]/loans
  - [x] PUT /api/properties/[id]/loans/[loanId]
  - [x] DELETE /api/properties/[id]/loans/[loanId]
- [x] PropertyLoansManager component created
- [x] Component integrated into investment details page
- [x] Batch import scripts created

## 🧪 Testing Steps

### 1. Database Verification
```bash
# Verify PropertyLoan table exists
npx prisma studio
# Or check via API/DB directly
```

### 2. UI Testing

#### Test 1: View Loans (Admin/Manager)
1. Start dev server: `npm run dev`
2. Log in as admin at `/investors/login`
3. Navigate to any investment/property details page
4. **Expected**: "Property Loans Manager" section visible
5. **If no loans**: Should show "No loans found" message
6. **If loans exist**: Should display loan cards with details

#### Test 2: Add Loan
1. Click "Add Loan" button
2. Fill required fields:
   - Lender Name: "Metairie Bank"
   - Original Amount: 100000
   - Current Balance: 95000
3. Fill optional fields:
   - Account Number: "12345"
   - Interest Rate: 5.5
   - Loan Date: Select date
   - Maturity Date: Select date
   - Monthly Payment: 5000
   - Loan Type: "Mortgage"
   - Notes: "Test loan"
4. Click "Save Loan"
5. **Expected**: 
   - Modal closes
   - New loan appears in list
   - Property debt amount updates automatically
   - Success message displayed

#### Test 3: Edit Loan
1. Click edit icon (pencil) on any loan
2. Modify fields (e.g., change current balance to 90000)
3. Click "Save Changes"
4. **Expected**:
   - Changes saved
   - Loan card updates
   - Property debt recalculates
   - Success message

#### Test 4: Delete Loan
1. Click delete icon (trash) on a loan
2. Confirm deletion in modal
3. **Expected**:
   - Loan removed from list
   - Property debt updates
   - Success message

#### Test 5: Multiple Loans
1. Add 2-3 loans to same property
2. **Expected**:
   - All loans display in list
   - Totals show:
     - Total Original Amount (sum of all original amounts)
     - Current Total Debt (sum of all current balances)
     - Active Loan Count
   - Each loan shows individual details

### 3. API Testing (Optional - Manual)

#### Test GET Endpoint
```bash
# Use browser dev tools or Postman
GET /api/properties/[propertyId]/loans
Authorization: Bearer [token]

# Expected response:
{
  "loans": [...],
  "totals": {
    "totalCurrentDebt": 0,
    "totalOriginalAmount": 0,
    "loanCount": 0
  }
}
```

#### Test POST Endpoint
```json
POST /api/properties/[propertyId]/loans
Authorization: Bearer [token]
Content-Type: application/json

{
  "lenderName": "Test Bank",
  "originalAmount": 100000,
  "currentBalance": 95000,
  "accountNumber": "TEST123",
  "interestRate": 5.5,
  "loanDate": "2024-01-01",
  "maturityDate": "2029-01-01",
  "monthlyPayment": 5000,
  "loanType": "Mortgage",
  "notes": "Test loan"
}
```

### 4. Import Script Testing

#### Test Batch Import
```bash
# Update emails in batch-import-all-data.js first
node scripts/batch-import-all-data.js
```

**Expected Output**:
- Users created/verified
- Entities created
- Properties linked to entities
- Loans imported with correct amounts
- Property debt amounts updated

**Verify**:
- Check database for PropertyLoan records
- Check property.debtAmount matches sum of loans
- Check loan details match CSV data

### 5. Edge Cases

- [ ] Add loan with only required fields (works)
- [ ] Add loan with all fields (works)
- [ ] Edit loan to set balance to 0 (works)
- [ ] Delete last loan (property debt should be 0)
- [ ] Add multiple loans, verify totals correct
- [ ] Verify only Admin/Manager can see/use UI
- [ ] Verify property debt updates when loan balance changes
- [ ] Test with invalid property ID (404 error)
- [ ] Test with unauthorized user (403 error)

### 6. Integration with Existing Features

- [ ] Verify property debt amount appears correctly on property cards
- [ ] Verify debt affects distribution calculations
- [ ] Verify refinance distribution uses loan amounts correctly
- [ ] Check that loan data doesn't break existing investment views

## 🐛 Known Issues / Notes

- PropertyLoan uses `cuid()` for IDs (standard Prisma pattern)
- Loans automatically update property.debtAmount (sum of active loans)
- Only active loans (isActive=true) count toward debt totals
- Loans can be soft-deleted by setting isActive=false

## 📝 Next Steps After Testing

1. Run batch import: `node scripts/batch-import-all-data.js`
2. Verify all loans imported correctly
3. Update user emails in script if needed
4. Set up nested entity ownership (CR2, CR3)
5. Document any issues found during testing

## ✨ Success Criteria

✅ Loans can be added via UI
✅ Loans can be edited via UI  
✅ Loans can be deleted via UI
✅ Property debt automatically updates
✅ Multiple loans per property work correctly
✅ Batch import script runs successfully
✅ All API endpoints return correct data
✅ UI only visible to Admin/Manager
✅ No console errors in browser
✅ Database schema correct

