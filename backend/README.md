# AfriLend Backend API

A complete backend API for the AfriLend micro-lending dApp built with Express, TypeScript, and Hedera integration.

## Features

- ✅ User Management (Registration, Profile, Stats)
- ✅ Loan Management (Create, Track, Repay)
- ✅ Lender Pool Management (Create, Fund, Track)
- ✅ Reputation System
- ✅ Interest Calculation
- ✅ Comprehensive Error Handling
- ✅ RESTful API Endpoints
- ✅ Ready for Hedera Integration

## Installation

### Prerequisites
- Node.js 16+
- npm or yarn

### Setup

1. **Clone and navigate to server directory:**
```bash
cd server
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create .env file:**
```bash
cp .env.example .env
```

4. **Update .env with your values:**
```
PORT=3001
NODE_ENV=development
HEDERA_ACCOUNT_ID=0.0.123456
HEDERA_PRIVATE_KEY=your_private_key
```

5. **Run development server:**
```bash
npm run dev
```

Server will start at `http://localhost:3001`

## API Endpoints

### Users
- `POST /api/users/register` - Register new user
- `GET /api/users` - Get all users
- `GET /api/users/:userId` - Get user details
- `GET /api/users/account/:accountId` - Get user by account ID
- `GET /api/users/stats/:userId` - Get user statistics

### Loans
- `POST /api/loans/create` - Create new loan
- `GET /api/loans` - Get all loans
- `GET /api/loans/:loanId` - Get loan details
- `GET /api/loans/borrower/:borrowerId` - Get borrower's loans
- `GET /api/loans/pool/:poolId` - Get pool's loans
- `POST /api/loans/:loanId/repay` - Repay a loan

### Pools
- `POST /api/pools/create` - Create new pool
- `GET /api/pools` - Get all pools
- `GET /api/pools/:poolId` - Get pool details
- `GET /api/pools/manager/:managerId` - Get manager's pools
- `POST /api/pools/:poolId/fund` - Fund a pool
- `GET /api/pools/fundings/:poolId` - Get pool funding history

### Stats
- `GET /api/stats/overview` - Get platform overview

### Health
- `GET /api/health` - Health check
- `GET /` - API info

## Example Usage

### Register a User
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "0.0.123456",
    "name": "John Doe",
    "email": "john@example.com"
  }'
```

### Create a Pool
```bash
curl -X POST http://localhost:3001/api/pools/create \
  -H "Content-Type: application/json" \
  -d '{
    "poolManager": "user_id_here",
    "poolName": "East Africa Fund",
    "initialFunding": 50000
  }'
```

### Create a Loan
```bash
curl -X POST http://localhost:3001/api/loans/create \
  -H "Content-Type: application/json" \
  -d '{
    "borrowerId": "user_id_here",
    "poolId": "pool_id_here",
    "amount": 5000,
    "interestRate": 8,
    "durationDays": 30
  }'
```

### Repay a Loan
```bash
curl -X POST http://localhost:3001/api/loans/loan_id_here/repay \
  -H "Content-Type: application/json" \
  -d '{"repayAmount": 5400}'
```

## Project Structure

```
server/
├── src/
│   ├── config/           # Database types and storage
│   ├── services/         # Business logic
│   ├── routes/           # API endpoints
│   ├── middleware/       # Error handling
│   ├── utils/            # Helpers and validators
│   └── index.ts          # Main app entry
├── dist/                 # Compiled JavaScript
├── .env                  # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Build & Deploy

### Build for production:
```bash
npm run build
```

### Start production server:
```bash
npm start
```

## Deployment Options

### Railway (Recommended - Free)
1. Go to https://railway.app
2. Sign up with GitHub
3. New Project → Deploy from GitHub
4. Select your repository
5. Auto-deploys on push

### Render
1. Go to https://render.com
2. New Web Service → Connect GitHub
3. Deploy automatically

### Vercel Functions
1. Go to https://vercel.com
2. Import your repo
3. Deploy with serverless functions

## Environment Variables

```
PORT=3001                           # Server port
NODE_ENV=development                # Environment
HEDERA_ACCOUNT_ID=0.0.123456       # Hedera account
HEDERA_PRIVATE_KEY=key_here         # Hedera key
```

## Error Handling

All endpoints return consistent JSON responses:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Database

Currently uses in-memory storage. For production, integrate:
- MongoDB
- PostgreSQL
- Firebase Firestore

## Next Steps

1. Add authentication (JWT)
2. Integrate Hedera smart contracts
3. Add database (MongoDB/PostgreSQL)
4. Add rate limiting
5. Add request validation middleware
6. Add logging service
7. Add unit tests

## License

MIT
