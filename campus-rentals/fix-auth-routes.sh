#!/bin/bash

# Script to fix all API routes with null check for requireAuth

# Find all API route files that use requireAuth
find src/app/api -name "route.ts" -type f | while read file; do
  echo "Processing $file"
  
  # Check if file contains requireAuth
  if grep -q "requireAuth" "$file"; then
    # Create a backup
    cp "$file" "$file.backup"
    
    # Add null check after requireAuth call
    sed -i 's/const user = await requireAuth(request)/const user = await requireAuth(request)\n    \n    if (!user) {\n      return NextResponse.json(\n        { error: '\''Authentication required'\'' },\n        { status: 401 }\n      )\n    }/' "$file"
    
    echo "Fixed $file"
  fi
done

echo "All API routes have been updated with null checks"
