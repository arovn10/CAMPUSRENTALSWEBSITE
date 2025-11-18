# Batch Import Guide

## Overview
This guide will help you import all your investment data into the database, including:
- Properties and their details
- Entities (Campus Rentals LLC, Campus Rentals 2 LLC, Campus Rentals 3 LLC)
- Entity ownership structure
- Entity investments in properties
- Property loans from the debt schedule

## Prerequisites

1. **Database Migration**: First, run the Prisma migration to create the `PropertyLoan` table:
   ```bash
   npx prisma migrate dev --name add_property_loans
   ```
   
   OR if that doesn't work:
   ```bash
   npx prisma db push
   ```

2. **Verify Admin User**: Make sure you have an admin user in the database. The script will use the first admin it finds, or create one if none exists.

## Step 1: Update User Emails

Before running the import, update the email addresses in `scripts/batch-import-all-data.js`:

- **Alec Rovner**: Currently set to `alec@campusrentalsllc.com` (update if different)
- **Sam Torres**: Currently set to `sam.torres@example.com` (update to actual email)

## Step 2: Run the Import Script

```bash
node scripts/batch-import-all-data.js
```

**⚠️ IMPORTANT:** This script will **DELETE** all existing entity investments and property loans before importing new data. This ensures a clean import.

The script will:
1. 🗑️ **Delete all existing entity investments and property loans**
2. ✅ Create/verify users (Steven, Alec, Sam)
3. ✅ Create entities (Campus Rentals LLC, Campus Rentals 2 LLC, Campus Rentals 3 LLC)
4. ✅ Set up entity ownership (51% Steven, 49% Alec for CR LLC)
5. ✅ Import all loans from the debt schedule (finds earliest loan date)
6. ✅ Create entity investments with **investment date = earliest loan origination date**
7. ✅ Update property debt amounts automatically

## Step 3: Verify the Data

After import, check:
1. Properties have correct investment amounts
2. Entities are linked to correct properties
3. Loans are imported with correct amounts
4. Property debt totals are calculated correctly

## Step 4: Set Up Nested Entity Ownership

Currently, the script sets up:
- Campus Rentals LLC: 51% Steven, 49% Alec

For **Campus Rentals 2 LLC** and **Campus Rentals 3 LLC**, you'll need to:
1. Log into the admin dashboard
2. Edit each entity
3. Add Campus Rentals LLC as an owner (66.67% for CR2, 50% for CR3)
4. Add Sam Torres as an owner (33.33% for CR2, 50% for CR3)

## Files Created

- `scripts/batch-import-all-data.js` - Main import script
- `scripts/batch-import-loans.js` - Loans-only import (if needed separately)
- `scripts/migrate-loans.sql` - SQL migration (backup)

## Troubleshooting

### Error: "No admin user found"
- Create an admin user through the web interface first
- Or update the script to use your admin email

### Error: "Property not found"
- The script matches properties by address
- Check that property addresses in the database match exactly
- Update the `propertyData` object in the script if addresses differ

### Error: "Entity not found"
- The script will create entities automatically
- If this fails, check entity names match exactly

## Manual Updates

If you need to manually update data after import:
1. Use the admin dashboard at `/investors/dashboard`
2. Navigate to investment details page
3. Use the "Property Loans Manager" section (visible to Admin/Manager)
4. Add, edit, or delete loans as needed

## Loan Management Features

Once imported, you can:
- ✅ View all loans for a property
- ✅ Add new loans
- ✅ Edit existing loans (update balance, payment, etc.)
- ✅ Delete loans
- ✅ See total original loan amount vs. current debt
- ✅ Automatic debt calculation when loans change

All changes automatically update the property's `debtAmount` and `debtDetails` fields!

