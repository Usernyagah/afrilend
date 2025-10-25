const request = require('supertest');
const app = require('../index');
const User = require('../models/User');
const Loan = require('../models/Loan');

describe('Loan API Endpoints', () => {
  let testUser;
  let testLoan;
  let authToken;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+1234567890',
      country: 'Nigeria',
      dateOfBirth: new Date('1990-01-01'),
      occupation: 'Developer',
      monthlyIncome: 5000,
      isVerified: true,
      kycStatus: 'verified'
    });

    // Generate auth token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: 'user' },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser) {
      await testUser.delete();
    }
    if (testLoan) {
      await testLoan.delete();
    }
  });

  describe('POST /api/loans', () => {
    it('should create a new loan', async () => {
      const loanData = {
        amount: 1000,
        interestRate: 10,
        duration: 90,
        purpose: 'Business expansion',
        category: 'business',
        description: 'Need funds to expand my small business operations'
      };

      const response = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(loanData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.amount).toBe(loanData.amount);
      expect(response.body.data.borrowerId).toBe(testUser.id);

      testLoan = await Loan.findById(response.body.data.id);
    });

    it('should not create loan for unverified user', async () => {
      const unverifiedUser = await User.create({
        email: 'unverified@example.com',
        password: 'hashedpassword',
        firstName: 'Unverified',
        lastName: 'User',
        phoneNumber: '+1234567891',
        country: 'Nigeria',
        dateOfBirth: new Date('1990-01-01'),
        occupation: 'Developer',
        monthlyIncome: 5000,
        isVerified: false,
        kycStatus: 'pending'
      });

      const jwt = require('jsonwebtoken');
      const unverifiedToken = jwt.sign(
        { id: unverifiedUser.id, email: unverifiedUser.email, role: 'user' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const loanData = {
        amount: 1000,
        interestRate: 10,
        duration: 90,
        purpose: 'Business expansion',
        category: 'business',
        description: 'Need funds to expand my small business operations'
      };

      await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send(loanData)
        .expect(403);

      await unverifiedUser.delete();
    });

    it('should validate loan data', async () => {
      const invalidLoanData = {
        amount: -100, // Invalid amount
        interestRate: 100, // Invalid interest rate
        duration: 10, // Invalid duration
        purpose: '', // Empty purpose
        category: 'invalid', // Invalid category
        description: 'Short' // Too short description
      };

      await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidLoanData)
        .expect(400);
    });
  });

  describe('GET /api/loans', () => {
    it('should get all loans', async () => {
      const response = await request(app)
        .get('/api/loans')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('loans');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.loans)).toBe(true);
    });

    it('should filter loans by category', async () => {
      const response = await request(app)
        .get('/api/loans?category=business')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.loans.forEach(loan => {
        expect(loan.category).toBe('business');
      });
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/loans?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.loans.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/loans/:id', () => {
    it('should get loan by ID', async () => {
      const response = await request(app)
        .get(`/api/loans/${testLoan.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testLoan.id);
      expect(response.body.data.amount).toBe(testLoan.amount);
    });

    it('should return 404 for non-existent loan', async () => {
      await request(app)
        .get('/api/loans/non-existent-id')
        .expect(404);
    });

    it('should increment view count', async () => {
      const initialViews = testLoan.views;
      
      await request(app)
        .get(`/api/loans/${testLoan.id}`)
        .expect(200);

      const updatedLoan = await Loan.findById(testLoan.id);
      expect(updatedLoan.views).toBe(initialViews + 1);
    });
  });

  describe('POST /api/loans/:id/fund', () => {
    let lenderUser;
    let lenderToken;

    beforeAll(async () => {
      // Create lender user
      lenderUser = await User.create({
        email: 'lender@example.com',
        password: 'hashedpassword',
        firstName: 'Lender',
        lastName: 'User',
        phoneNumber: '+1234567892',
        country: 'Nigeria',
        dateOfBirth: new Date('1990-01-01'),
        occupation: 'Investor',
        monthlyIncome: 10000,
        isVerified: true,
        kycStatus: 'verified',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });

      const jwt = require('jsonwebtoken');
      lenderToken = jwt.sign(
        { id: lenderUser.id, email: lenderUser.email, role: 'user' },
        process.env.JWT_SECRET || 'test-secret'
      );
    });

    afterAll(async () => {
      if (lenderUser) {
        await lenderUser.delete();
      }
    });

    it('should fund a loan', async () => {
      const fundingData = {
        amount: 500
      };

      const response = await request(app)
        .post(`/api/loans/${testLoan.id}/fund`)
        .set('Authorization', `Bearer ${lenderToken}`)
        .send(fundingData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fundedAmount).toBe(fundingData.amount);
    });

    it('should not allow borrower to fund own loan', async () => {
      const fundingData = {
        amount: 500
      };

      await request(app)
        .post(`/api/loans/${testLoan.id}/fund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(fundingData)
        .expect(400);
    });

    it('should not fund non-existent loan', async () => {
      const fundingData = {
        amount: 500
      };

      await request(app)
        .post('/api/loans/non-existent-id/fund')
        .set('Authorization', `Bearer ${lenderToken}`)
        .send(fundingData)
        .expect(404);
    });
  });

  describe('POST /api/loans/:id/repay', () => {
    it('should repay a loan', async () => {
      // First, fully fund the loan
      const lenderUser = await User.create({
        email: 'lender2@example.com',
        password: 'hashedpassword',
        firstName: 'Lender2',
        lastName: 'User',
        phoneNumber: '+1234567893',
        country: 'Nigeria',
        dateOfBirth: new Date('1990-01-01'),
        occupation: 'Investor',
        monthlyIncome: 10000,
        isVerified: true,
        kycStatus: 'verified',
        walletAddress: '0x1234567890123456789012345678901234567891'
      });

      const jwt = require('jsonwebtoken');
      const lenderToken = jwt.sign(
        { id: lenderUser.id, email: lenderUser.email, role: 'user' },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Fund the remaining amount
      await request(app)
        .post(`/api/loans/${testLoan.id}/fund`)
        .set('Authorization', `Bearer ${lenderToken}`)
        .send({ amount: 500 })
        .expect(200);

      // Now repay the loan
      const repaymentData = {
        amount: 1100, // Principal + interest
        paymentMethod: 'wallet'
      };

      const response = await request(app)
        .post(`/api/loans/${testLoan.id}/repay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(repaymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('repaid');

      await lenderUser.delete();
    });

    it('should not allow non-borrower to repay loan', async () => {
      const repaymentData = {
        amount: 1100,
        paymentMethod: 'wallet'
      };

      const jwt = require('jsonwebtoken');
      const otherUserToken = jwt.sign(
        { id: 'other-user-id', email: 'other@example.com', role: 'user' },
        process.env.JWT_SECRET || 'test-secret'
      );

      await request(app)
        .post(`/api/loans/${testLoan.id}/repay`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(repaymentData)
        .expect(403);
    });
  });

  describe('PUT /api/loans/:id', () => {
    it('should update loan', async () => {
      const updateData = {
        description: 'Updated description for business expansion'
      };

      const response = await request(app)
        .put(`/api/loans/${testLoan.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should not allow non-borrower to update loan', async () => {
      const updateData = {
        description: 'Unauthorized update'
      };

      const jwt = require('jsonwebtoken');
      const otherUserToken = jwt.sign(
        { id: 'other-user-id', email: 'other@example.com', role: 'user' },
        process.env.JWT_SECRET || 'test-secret'
      );

      await request(app)
        .put(`/api/loans/${testLoan.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('DELETE /api/loans/:id', () => {
    it('should cancel loan', async () => {
      // Create a new pending loan for cancellation
      const newLoan = await Loan.create({
        borrowerId: testUser.id,
        amount: 500,
        interestRate: 8,
        duration: 60,
        purpose: 'Test loan for cancellation',
        category: 'business',
        description: 'This loan will be cancelled',
        status: 'pending'
      });

      const response = await request(app)
        .delete(`/api/loans/${newLoan.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      await newLoan.delete();
    });

    it('should not cancel funded loan', async () => {
      await request(app)
        .delete(`/api/loans/${testLoan.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /api/loans/search', () => {
    it('should search loans by query', async () => {
      const response = await request(app)
        .get('/api/loans/search?query=business')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.loans.length).toBeGreaterThan(0);
    });

    it('should filter by amount range', async () => {
      const response = await request(app)
        .get('/api/loans/search?minAmount=500&maxAmount=1500')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.loans.forEach(loan => {
        expect(loan.amount).toBeGreaterThanOrEqual(500);
        expect(loan.amount).toBeLessThanOrEqual(1500);
      });
    });
  });

  describe('GET /api/loans/stats/overview', () => {
    it('should get loan statistics', async () => {
      const response = await request(app)
        .get('/api/loans/stats/overview')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalLoans');
      expect(response.body.data).toHaveProperty('activeLoans');
      expect(response.body.data).toHaveProperty('fundedLoans');
      expect(response.body.data).toHaveProperty('repaidLoans');
      expect(response.body.data).toHaveProperty('totalVolume');
    });
  });
});
