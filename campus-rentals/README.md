# Campus Rentals Website

A modern Next.js application for managing student rental properties with investor dashboard functionality.

## Project Structure

```
campus-rentals/
├── src/                          # Source code
│   ├── app/                      # Next.js app router
│   │   ├── api/                  # API routes
│   │   │   ├── auth/             # Authentication endpoints
│   │   │   ├── investors/        # Investor management APIs
│   │   │   ├── properties/       # Property management APIs
│   │   │   └── ...               # Other API endpoints
│   │   ├── admin/                # Admin pages
│   │   ├── investors/            # Investor dashboard pages
│   │   ├── properties/           # Property listing pages
│   │   └── ...                   # Other pages
│   ├── components/               # React components
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility libraries
│   ├── services/                 # API service functions
│   ├── types/                    # TypeScript type definitions
│   └── utils/                    # Utility functions
├── prisma/                       # Database schema and migrations
├── public/                       # Static assets
├── scripts/                      # Deployment and utility scripts
│   ├── auto-deploy.sh           # Main deployment script
│   ├── final-deployment.sh      # Production deployment
│   ├── ssl-setup.sh             # SSL certificate setup
│   └── ...                      # Other scripts
├── docs/                         # Documentation
│   ├── DEPLOYMENT_GUIDE.md      # Deployment instructions
│   ├── SSL_DEPLOYMENT_GUIDE.md  # SSL setup guide
│   └── CACHE_SYSTEM.md          # Caching system documentation
└── icons/                        # Brand assets and logos
```

## Key Features

- **Property Management**: List, view, and manage rental properties
- **Investor Dashboard**: Secure investor portal with investment tracking
- **Waterfall Distributions**: Complex financial distribution calculations
- **Admin Panel**: User management and system administration
- **Authentication**: Secure user authentication and authorization
- **Document Management**: File upload and management system

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: Custom JWT-based auth system
- **Deployment**: AWS Lightsail with PM2 process management

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp scripts/env.template .env.local
   # Edit .env.local with your configuration
   ```

3. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Development Server**
   ```bash
   npm run dev
   ```

## Deployment

The main deployment script is `scripts/auto-deploy.sh`. See `docs/DEPLOYMENT_GUIDE.md` for detailed instructions.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Properties
- `GET /api/properties` - List all properties
- `POST /api/properties` - Create new property
- `GET /api/properties/[id]` - Get property details

### Investors
- `GET /api/investors/users` - List all users
- `PUT /api/investors/users/[id]/change-password` - Change user password (admin)
- `POST /api/investors/users/reset-password` - Reset user password (admin)
- `PUT /api/investors/users/change-my-password` - Change own password

### Waterfall Distributions
- `GET /api/investors/waterfall-distributions` - List distributions
- `POST /api/investors/waterfall-distributions` - Create distribution
- `PUT /api/investors/waterfall-distributions` - Update distribution
- `DELETE /api/investors/waterfall-distributions` - Delete distribution

## Database Schema

The application uses Prisma ORM with PostgreSQL. Key models include:
- `User` - User accounts and authentication
- `Property` - Rental properties
- `Investment` - Investor property investments
- `WaterfallDistribution` - Financial distributions
- `WaterfallTierDistribution` - Distribution tier details

## Security

- JWT-based authentication
- Role-based access control (ADMIN, USER)
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Private - Campus Rentals LLC
