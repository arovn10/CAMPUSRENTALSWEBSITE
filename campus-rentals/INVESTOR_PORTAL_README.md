# Campus Rentals Investor Portal

A comprehensive investor portal that competes with Juniper Square, providing full-featured investment management, fund administration, document management, and financial reporting capabilities.

## 🚀 Features

### Core Investment Management
- **Property Investments**: Direct property investment tracking with detailed financial metrics
- **Fund Investments**: Multi-property fund management with waterfall calculations
- **Distribution Tracking**: Automated distribution calculations and tax reporting
- **Performance Analytics**: IRR, cash-on-cash returns, equity multiples, and more

### Fund Administration
- **Fund Creation & Management**: Create and manage real estate funds, opportunity zone funds, and more
- **Waterfall Calculations**: Automated preferred return and promote calculations
- **Investor Onboarding**: KYC verification and investor qualification
- **Fund Performance Tracking**: Real-time fund utilization and performance metrics

### Document Management
- **Secure Document Storage**: Upload and manage legal documents, financial statements, and reports
- **Document Categories**: Operating agreements, PPMs, tax documents, and more
- **Access Control**: Role-based document access and permissions
- **Version Control**: Track document updates and changes

### Financial Reporting
- **Portfolio Reports**: Comprehensive portfolio overview and analysis
- **Tax Reports**: Annual tax summaries and K-1 generation
- **Performance Reports**: Detailed performance metrics and benchmarking
- **Custom Reports**: Configurable report templates and schedules

### User Management & Security
- **Multi-Role System**: Admin, Sponsor, Investor, and Manager roles
- **KYC Verification**: Investor qualification and compliance tracking
- **Audit Logging**: Complete audit trail for all system activities
- **Secure Authentication**: JWT-based authentication with role-based access

### Notifications & Communication
- **Real-time Notifications**: Distribution alerts, document uploads, and system updates
- **Email Integration**: Automated email notifications for important events
- **In-app Messaging**: Direct communication between investors and sponsors

## 🏗️ Architecture

### Database Schema
The portal uses a comprehensive Prisma schema with the following key models:

- **Users**: Multi-role user management with KYC status
- **Properties**: Enhanced property tracking with income/expense management
- **Funds**: Fund administration with waterfall configurations
- **Investments**: Both direct property and fund investments
- **Distributions**: Automated distribution calculations and tax tracking
- **Documents**: Secure document management with access control
- **Notifications**: Real-time notification system
- **Financial Calculations**: Cached financial metrics for performance

### API Structure
- `/api/investors/properties` - Property investment management
- `/api/investors/funds` - Fund investment management
- `/api/investors/documents` - Document management
- `/api/investors/notifications` - Notification system
- `/api/investors/reports` - Financial reporting
- `/api/investors/stats` - Portfolio statistics

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd campus-rentals
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.template .env.local
   ```
   
   Configure the following variables in `.env.local`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/campus_rentals"
   JWT_SECRET="your-secret-key-here"
   ```

4. **Set up the database**
   ```bash
   chmod +x setup-database.sh
   ./setup-database.sh
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the portal**
   - Investor Portal: http://localhost:3000/investors/login
   - Main Website: http://localhost:3000

## 👥 User Accounts

The system comes pre-configured with sample users:

### Admin User
- **Email**: rovnerproperties@gmail.com
- **Password**: Celarev0319942002!
- **Role**: Full system access

### Investor User
- **Email**: srovner@dial-law.com
- **Password**: 15Saratoga!
- **Role**: Investor access with sample investments

### Sponsor User
- **Email**: sponsor@campusrentals.com
- **Password**: Sponsor2024!
- **Role**: Fund management and sponsor access

## 📊 Sample Data

The database is seeded with comprehensive sample data including:

- **4 Properties**: Real estate properties with photos and financial data
- **2 Funds**: Campus Rentals Fund I and Opportunity Zone Fund
- **3 Investors**: Sample investor accounts with investments
- **Financial Data**: Distributions, income, expenses, and performance metrics
- **Documents**: Sample legal documents and financial statements
- **Notifications**: Sample notifications for testing

## 🔧 Development

### Database Management
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Open Prisma Studio
npx prisma studio
```

### API Development
- All API routes are in `/src/app/api/`
- Authentication middleware in `/lib/auth.ts`
- Database operations use Prisma client

### Frontend Development
- React components in `/src/components/`
- Pages in `/src/app/`
- Styling with Tailwind CSS

## 📈 Key Metrics & Calculations

### Investment Performance
- **IRR (Internal Rate of Return)**: Time-weighted return calculation
- **Cash-on-Cash Return**: Annual cash flow relative to investment
- **Equity Multiple**: Total return multiple on invested capital
- **Cap Rate**: Net operating income relative to property value

### Fund Metrics
- **Fund Utilization**: Percentage of target fund size raised
- **Waterfall Calculations**: Preferred return and promote distributions
- **Fund Performance**: Aggregate performance across all fund properties

### Portfolio Analytics
- **Total Invested**: Sum of all investments across properties and funds
- **Current Value**: Estimated current value of all holdings
- **Total Return**: Combined appreciation and distributions
- **Average IRR**: Portfolio-weighted average return

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions by user role
- **Data Encryption**: Sensitive data encryption at rest
- **Audit Logging**: Complete audit trail for compliance
- **Input Validation**: Comprehensive input sanitization

## 📱 User Interface

### Dashboard Features
- **Portfolio Overview**: Real-time portfolio metrics and performance
- **Property Management**: Detailed property views with financial data
- **Fund Management**: Fund performance and investor tracking
- **Document Center**: Secure document access and management
- **Reporting Suite**: Comprehensive financial reporting tools

### Responsive Design
- Mobile-optimized interface
- Tablet and desktop support
- Modern, professional design
- Intuitive navigation

## 🚀 Deployment

### Production Setup
1. Set up production database
2. Configure environment variables
3. Run database migrations
4. Build and deploy application
5. Set up SSL certificates
6. Configure monitoring and logging

### Recommended Hosting
- **Database**: AWS RDS PostgreSQL or similar
- **Application**: Vercel, AWS, or similar cloud platform
- **File Storage**: AWS S3 for document storage
- **CDN**: CloudFront or similar for static assets

## 📞 Support

For technical support or questions about the investor portal:

- **Email**: support@campusrentals.com
- **Documentation**: See inline code comments and API documentation
- **Issues**: Create GitHub issues for bug reports

## 🔄 Updates & Maintenance

### Regular Maintenance
- Database backups
- Security updates
- Performance monitoring
- User access reviews

### Feature Updates
- Quarterly feature releases
- Security patches as needed
- Performance optimizations
- User feedback integration

---

**Campus Rentals Investor Portal** - Professional-grade investment management platform built for modern real estate investment firms. 