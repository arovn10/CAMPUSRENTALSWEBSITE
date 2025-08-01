# 🏗️ Investor Portal Setup Guide

## 📋 Overview

This investor portal provides a comprehensive Juniper Square-like platform for managing real estate investments, including:

- **User Authentication**: Secure login for investors and administrators
- **Property Management**: Link to existing properties with investment details
- **Investment Tracking**: Monitor investment amounts, returns, and distributions
- **Financial Calculations**: IRR, cash-on-cash returns, waterfall calculations
- **Distribution Management**: Track and manage investor distributions
- **Portfolio Analytics**: Comprehensive dashboard with key metrics

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

#### Option A: PostgreSQL (Recommended)
```bash
# Add to your .env.local file:
DATABASE_URL="postgresql://username:password@localhost:5432/campus_rentals_investors"
JWT_SECRET="your-super-secret-jwt-key-here"
```

#### Option B: SQLite (Development)
```bash
# Add to your .env.local file:
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-here"
```

### 3. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed initial users
npx prisma db seed
```

### 4. Start Development Server

```bash
npm run dev
```

## 👥 Initial Users

The system comes with two pre-configured users:

### Admin User
- **Email**: `rovnerproperties@gmail.com`
- **Password**: `Celarev0319942002!`
- **Role**: `ADMIN`
- **Access**: Full system access, can manage all properties and investors

### Investor User
- **Email**: `srovner@dial-law.com`
- **Password**: `15Saratoga!`
- **Role**: `INVESTOR`
- **Access**: View assigned properties and investment details

## 🏠 Property Integration

### Linking Existing Properties

The investor portal integrates with your existing property system:

1. **Property Sync**: Properties from your main API are automatically synced
2. **Investment Assignment**: Admin can assign investors to specific properties
3. **Financial Tracking**: Track investment amounts, returns, and distributions per property

### Property Management Features

- **Investment Amounts**: Set and track individual investor contributions
- **Preferred Returns**: Configure preferred return rates per investor
- **Waterfall Calculations**: Automatic profit distribution calculations
- **Distribution Tracking**: Record and track all investor distributions
- **Financial Metrics**: IRR, cash-on-cash, total return calculations

## 📊 Financial Features

### Investment Tracking
- Individual investment amounts per property
- Preferred return rates
- Investment start/end dates
- Status tracking (Active, Sold, Transferred, Cancelled)

### Distribution Management
- **Types**: Preferred Return, Profit Share, Return of Capital, Sale Proceeds
- **Tracking**: Date, amount, type, and description
- **Calculations**: Automatic waterfall calculations

### Financial Calculations
- **IRR**: Internal Rate of Return calculations
- **Cash-on-Cash**: Annual cash flow returns
- **Total Return**: Overall investment performance
- **Waterfall**: Profit distribution calculations
- **Distribution Schedule**: Projected cash flows

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt password encryption
- **Role-Based Access**: Admin, Investor, and Manager roles
- **Property Access Control**: Granular property access permissions
- **HTTP-Only Cookies**: Secure session management

## 🎨 User Interface

### Investor Dashboard
- **Portfolio Overview**: Total invested, value, returns, IRR
- **Property Grid**: Visual property cards with key metrics
- **Financial Charts**: Performance visualization
- **Distribution History**: Complete distribution tracking

### Admin Features
- **User Management**: Add, edit, and manage investors
- **Property Assignment**: Link investors to properties
- **Financial Configuration**: Set waterfall and return parameters
- **Distribution Management**: Record and track distributions

## 📱 Navigation Integration

The investor portal is integrated into the main website:

- **Main Navigation**: "Investors" link in header
- **Direct Access**: `/investors/login` for portal access
- **Seamless Experience**: Consistent branding and design

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Investor Data
- `GET /api/investors/properties` - Get investor's properties
- `GET /api/investors/stats` - Get portfolio statistics
- `GET /api/investors/investments` - Get investment details
- `GET /api/investors/distributions` - Get distribution history

### Admin Management
- `POST /api/admin/users` - Create/manage users
- `POST /api/admin/investments` - Manage investments
- `POST /api/admin/distributions` - Record distributions
- `GET /api/admin/properties` - Get all properties

## 🚀 Deployment

### Environment Variables
```bash
DATABASE_URL="your-database-connection-string"
JWT_SECRET="your-jwt-secret-key"
NODE_ENV="production"
```

### Database Migration
```bash
npx prisma generate
npx prisma db push
```

### Build and Deploy
```bash
npm run build
npm start
```

## 📈 Future Enhancements

### Phase 2 Features
- **Document Management**: Upload and share investment documents
- **Communication Tools**: Investor messaging and notifications
- **Advanced Analytics**: Detailed performance reports and charts
- **Mobile App**: Native mobile application for investors
- **Integration APIs**: Connect with accounting and banking systems

### Phase 3 Features
- **Fund Management**: Multi-property fund structures
- **Secondary Market**: Investor-to-investor trading platform
- **Regulatory Compliance**: SEC and state-specific compliance tools
- **Advanced Reporting**: Custom report generation
- **API Access**: Third-party integration capabilities

## 🆘 Support

For technical support or questions:
- **Email**: rovnerproperties@gmail.com
- **Documentation**: This setup guide
- **Issues**: Check the GitHub repository for known issues

## 🔄 Updates

The investor portal will be regularly updated with:
- Security patches
- New features
- Performance improvements
- Bug fixes

Stay updated by checking the repository regularly. 