# Import Script Updates

## ✅ Changes Made

### 1. Data Clearing
The script now **deletes all existing data** before importing:
- All entity investments are deleted
- All property loans are deleted
- Property debt amounts are reset to 0

This ensures a clean import with no duplicates or stale data.

### 2. Investment Date Logic
Investment dates are now set based on loan origination dates:
- **If loans exist**: Investment date = **earliest loan origination date** (first loan date)
- **If no loans**: Investment date = current date (fallback)

This ensures the investment date reflects when the property was actually acquired/financed.

### Example:
- Property has 2 loans:
  - Loan 1: Originated 2023-04-25
  - Loan 2: Originated 2024-05-29
- **Investment date will be set to: 2023-04-25** (the earliest)

## 🔄 Import Process Flow

1. **Clear old data** → Delete all investments and loans
2. **Create users** → Steven, Alec, Sam
3. **Create entities** → CR LLC, CR2 LLC, CR3 LLC
4. **For each property:**
   - Find earliest loan date (if loans exist)
   - Import all loans
   - Create entity investment with earliest loan date
   - Update property debt totals

## 📋 Usage

```bash
# Update emails in script first, then:
node scripts/batch-import-all-data.js
```

The script will output:
- Number of records deleted
- Properties processed
- Loans imported
- Investment dates set

## ⚠️ Warning

**This script deletes all existing data!** Make sure you want a fresh import before running.

