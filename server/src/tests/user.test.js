const request = require('supertest');
const app = require('../index');
const User = require('../models/User');
const { hashPassword } = require('../middleware/authMiddleware');

describe('User API Endpoints', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Clean up any existing test user
    const existingUser = await User.findByEmail('test@example.com');
    if (existingUser) {
      await existingUser.delete();
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser) {
      await testUser.delete();
    }
  });

  describe('POST /api/users/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+1234567890',
        country: 'Nigeria',
        dateOfBirth: '1990-01-01',
        occupation: 'Developer',
        monthlyIncome: 5000
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');

      testUser = await User.findById(response.body.data.user.id);
    });

    it('should not register user with existing email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Another',
        lastName: 'User',
        phoneNumber: '+1234567891',
        country: 'Nigeria',
        dateOfBirth: '1990-01-01',
        occupation: 'Developer',
        monthlyIncome: 5000
      };

      await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(400);
    });

    it('should validate user data', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        password: '123', // Too short
        firstName: '', // Empty
        lastName: '', // Empty
        phoneNumber: '123', // Invalid format
        country: '', // Empty
        dateOfBirth: 'invalid-date',
        occupation: '', // Empty
        monthlyIncome: -1000 // Negative
      };

      await request(app)
        .post('/api/users/register')
        .send(invalidUserData)
        .expect(400);
    });
  });

  describe('POST /api/users/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');

      authToken = response.body.data.token;
    });

    it('should not login with invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(401);
    });

    it('should not login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(401);
    });

    it('should validate login data', async () => {
      const invalidLoginData = {
        email: 'invalid-email',
        password: ''
      };

      await request(app)
        .post('/api/users/login')
        .send(invalidLoginData)
        .expect(400);
    });
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.firstName).toBe('Test');
      expect(response.body.data).toHaveProperty('reputation');
    });

    it('should not get profile without token', async () => {
      await request(app)
        .get('/api/users/profile')
        .expect(401);
    });

    it('should not get profile with invalid token', async () => {
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'Updated bio',
        occupation: 'Senior Developer'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updateData.firstName);
      expect(response.body.data.lastName).toBe(updateData.lastName);
      expect(response.body.data.bio).toBe(updateData.bio);
    });

    it('should validate update data', async () => {
      const invalidUpdateData = {
        firstName: '', // Empty
        phoneNumber: 'invalid', // Invalid format
        monthlyIncome: -1000 // Negative
      };

      await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(400);
    });
  });

  describe('POST /api/users/change-password', () => {
    it('should change password with valid current password', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword123'
      };

      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'newpassword123'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should not change password with invalid current password', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      };

      await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);
    });
  });

  describe('POST /api/users/forgot-password', () => {
    it('should send password reset email for existing user', async () => {
      const response = await request(app)
        .post('/api/users/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app)
        .post('/api/users/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/users/kyc/upload', () => {
    it('should upload KYC documents', async () => {
      const kycData = {
        documents: [
          {
            type: 'passport',
            url: 'https://example.com/passport.pdf'
          },
          {
            type: 'utility_bill',
            url: 'https://example.com/bill.pdf'
          }
        ]
      };

      const response = await request(app)
        .post('/api/users/kyc/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send(kycData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/users/kyc/status', () => {
    it('should get KYC status', async () => {
      const response = await request(app)
        .get('/api/users/kyc/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('kycStatus');
      expect(response.body.data).toHaveProperty('kycDocuments');
    });
  });

  describe('POST /api/users/wallet/connect', () => {
    it('should connect wallet address', async () => {
      const walletData = {
        walletAddress: '0x1234567890123456789012345678901234567890'
      };

      const response = await request(app)
        .post('/api/users/wallet/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate wallet address format', async () => {
      const walletData = {
        walletAddress: 'invalid-address'
      };

      await request(app)
        .post('/api/users/wallet/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData)
        .expect(400);
    });
  });

  describe('DELETE /api/users/wallet/disconnect', () => {
    it('should disconnect wallet address', async () => {
      const response = await request(app)
        .delete('/api/users/wallet/disconnect')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/users/reputation', () => {
    it('should get user reputation', async () => {
      const response = await request(app)
        .get('/api/users/reputation')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('score');
      expect(response.body.data).toHaveProperty('trustLevel');
    });
  });

  describe('GET /api/users/loans', () => {
    it('should get user loans', async () => {
      const response = await request(app)
        .get('/api/users/loans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('loans');
      expect(response.body.data).toHaveProperty('total');
    });
  });

  describe('GET /api/users/lending', () => {
    it('should get user lending history', async () => {
      const response = await request(app)
        .get('/api/users/lending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('lendingHistory');
      expect(response.body.data).toHaveProperty('total');
    });
  });

  describe('GET /api/users/transactions', () => {
    it('should get user transactions', async () => {
      const response = await request(app)
        .get('/api/users/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactions');
    });
  });

  describe('GET /api/users/notifications', () => {
    it('should get user notifications', async () => {
      const response = await request(app)
        .get('/api/users/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('notifications');
    });
  });

  describe('GET /api/users/:id/public', () => {
    it('should get public user profile', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}/public`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUser.id);
      expect(response.body.data.firstName).toBe('Updated');
      expect(response.body.data).not.toHaveProperty('email'); // Email should not be public
      expect(response.body.data).not.toHaveProperty('phoneNumber'); // Phone should not be public
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .get('/api/users/non-existent-id/public')
        .expect(404);
    });
  });

  describe('POST /api/users/:id/follow', () => {
    let otherUser;

    beforeAll(async () => {
      otherUser = await User.create({
        email: 'other@example.com',
        password: 'hashedpassword',
        firstName: 'Other',
        lastName: 'User',
        phoneNumber: '+1234567894',
        country: 'Nigeria',
        dateOfBirth: new Date('1990-01-01'),
        occupation: 'Designer',
        monthlyIncome: 4000,
        isVerified: true,
        kycStatus: 'verified'
      });
    });

    afterAll(async () => {
      if (otherUser) {
        await otherUser.delete();
      }
    });

    it('should follow a user', async () => {
      const response = await request(app)
        .post(`/api/users/${otherUser.id}/follow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not follow self', async () => {
      await request(app)
        .post(`/api/users/${testUser.id}/follow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /api/users/:id/followers', () => {
    it('should get user followers', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}/followers`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/users/:id/following', () => {
    it('should get user following', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}/following`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/users/export-data', () => {
    it('should export user data', async () => {
      const response = await request(app)
        .post('/api/users/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('loans');
      expect(response.body.data).toHaveProperty('transactions');
      expect(response.body.data).toHaveProperty('notifications');
      expect(response.body.data).toHaveProperty('exportedAt');
      expect(response.body.data.user).not.toHaveProperty('password'); // Password should not be exported
    });
  });

  describe('DELETE /api/users/account', () => {
    it('should delete user account', async () => {
      // Create a separate user for deletion test
      const deleteUser = await User.create({
        email: 'delete@example.com',
        password: 'hashedpassword',
        firstName: 'Delete',
        lastName: 'User',
        phoneNumber: '+1234567895',
        country: 'Nigeria',
        dateOfBirth: new Date('1990-01-01'),
        occupation: 'Tester',
        monthlyIncome: 3000,
        isVerified: true,
        kycStatus: 'verified'
      });

      const jwt = require('jsonwebtoken');
      const deleteToken = jwt.sign(
        { id: deleteUser.id, email: deleteUser.email, role: 'user' },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${deleteToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user is deleted
      const deletedUser = await User.findById(deleteUser.id);
      expect(deletedUser).toBeNull();
    });
  });
});
