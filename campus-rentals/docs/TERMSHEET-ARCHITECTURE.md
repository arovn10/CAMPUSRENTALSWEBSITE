# TermSheet Architecture for Campus Rentals

## Overview
This document outlines the architecture for building a comprehensive deal management and investment operating system for Campus Rentals, specialized for student housing.

## Reference
Based on TermSheet's platform: https://www.termsheet.com/

## Core Modules

### 1. Deal Management
- Pipeline management with custom stages
- Deal detail pages with comprehensive information
- Custom views and filters
- Excel integration for underwriting
- Deal scoring and ranking

### 2. Task Management
- Task lists, boards, and calendars
- Task templates for student housing workflows
- Task automation and dependencies
- Task assignment and tracking

### 3. Document Management
- Document templates (LOI, tear sheets, memos)
- Automated document generation
- Document versioning and storage
- Integration with S3

### 4. CRM (Enhanced)
- Contact management
- Relationship tracking
- Interaction history
- Student housing specific contacts

### 5. Maps & GIS
- Interactive property maps
- Market data overlays
- Competitive analysis
- University proximity analysis

### 6. Data Cloud
- External data source connections
- Data synchronization
- Data visualization
- Custom reports

## Student Housing Specialization

### University-Specific Features
- University database
- Distance to campus calculations
- Student population data
- Enrollment trends

### Property Metrics
- Bed count tracking
- Unit configurations
- Occupancy by unit type
- Rent per bed analysis

### Acquisition Workflow
- Student housing underwriting
- Bed count analysis
- Occupancy projections
- Rent roll analysis

## Technology Stack

### Frontend
- Next.js 14+ (App Router)
- React
- TypeScript
- Tailwind CSS
- Heroicons

### Backend
- Next.js API Routes
- Prisma ORM
- PostgreSQL (AWS RDS)
- AWS S3 (File Storage)

### Integrations
- Excel (underwriting models)
- Email (Outlook/Gmail)
- Calendar (Google/Outlook)
- Storage (Dropbox, OneDrive, SharePoint)

## Database Schema

### Core Tables
- `Deal` - Deal information
- `DealPipeline` - Pipeline definitions
- `DealStage` - Stage definitions
- `DealTask` - Task management
- `DealFile` - Document storage
- `Contact` - CRM contacts
- `DocumentTemplate` - Document templates
- `ExcelModel` - Excel integrations

### Student Housing Extensions
- University information
- Property bed/unit configurations
- Occupancy tracking
- Rent roll data

## Implementation Phases

See `TERMSHEET-IMPLEMENTATION-TODO.md` for detailed phase breakdown.

## Key Features from TermSheet

1. **Customizable Dashboards** - Views that reflect how you do business
2. **Real-time Data Sync** - Excel, Outlook, and more
3. **Automation** - Eliminate repetitive work
4. **Scalability** - Manage larger, more complex portfolios
5. **Integration** - Works with tools you already use

## Campus Rentals Specific Adaptations

1. **University Focus** - Specialized for student housing near universities
2. **Bed-based Metrics** - Track by beds, not just units
3. **Academic Calendar** - Lease terms aligned with semesters
4. **Campus Proximity** - Distance and walkability metrics
5. **Student Demographics** - Enrollment and population data

