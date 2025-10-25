const { getFirestore } = require('../config/firestore');
const logger = require('../utils/logger');

/**
 * User model for Firestore operations
 */
class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phoneNumber = data.phoneNumber;
    this.country = data.country;
    this.walletAddress = data.walletAddress;
    this.dateOfBirth = data.dateOfBirth;
    this.occupation = data.occupation;
    this.monthlyIncome = data.monthlyIncome;
    this.kycStatus = data.kycStatus || 'pending';
    this.isVerified = data.isVerified || false;
    this.profileImage = data.profileImage;
    this.bio = data.bio;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.lastLoginAt = data.lastLoginAt;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.role = data.role || 'user';
    this.preferences = data.preferences || {};
    this.notificationSettings = data.notificationSettings || {
      email: true,
      sms: true,
      push: true
    };
  }

  /**
   * Create a new user
   */
  static async create(userData) {
    try {
      const db = getFirestore();
      const userRef = db.collection('users').doc();
      
      const user = new User({
        id: userRef.id,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await userRef.set(user.toFirestore());
      
      logger.info(`✅ User created: ${user.id}`);
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(userId) {
    try {
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }

      return new User({ id: userDoc.id, ...userDoc.data() });
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    try {
      const db = getFirestore();
      const usersSnapshot = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        return null;
      }

      const userDoc = usersSnapshot.docs[0];
      return new User({ id: userDoc.id, ...userDoc.data() });
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by wallet address
   */
  static async findByWalletAddress(walletAddress) {
    try {
      const db = getFirestore();
      const usersSnapshot = await db.collection('users')
        .where('walletAddress', '==', walletAddress)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        return null;
      }

      const userDoc = usersSnapshot.docs[0];
      return new User({ id: userDoc.id, ...userDoc.data() });
    } catch (error) {
      logger.error('Error finding user by wallet address:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(updateData) {
    try {
      const db = getFirestore();
      const userRef = db.collection('users').doc(this.id);
      
      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      };

      await userRef.update(updatedData);
      
      // Update local instance
      Object.assign(this, updatedData);
      
      logger.info(`✅ User updated: ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async delete() {
    try {
      const db = getFirestore();
      await db.collection('users').doc(this.id).delete();
      
      logger.info(`✅ User deleted: ${this.id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get user's loans
   */
  async getLoans() {
    try {
      const db = getFirestore();
      const loansSnapshot = await db.collection('loans')
        .where('borrowerId', '==', this.id)
        .orderBy('createdAt', 'desc')
        .get();

      return loansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error getting user loans:', error);
      throw error;
    }
  }

  /**
   * Get user's lending history
   */
  async getLendingHistory() {
    try {
      const db = getFirestore();
      const loansSnapshot = await db.collection('loans')
        .where('lenders', 'array-contains', this.id)
        .orderBy('createdAt', 'desc')
        .get();

      return loansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error getting user lending history:', error);
      throw error;
    }
  }

  /**
   * Get user's reputation score
   */
  async getReputationScore() {
    try {
      const db = getFirestore();
      const reputationDoc = await db.collection('reputation').doc(this.id).get();
      
      if (!reputationDoc.exists) {
        return {
          score: 100,
          trustLevel: 'New',
          totalLoans: 0,
          successfulLoans: 0,
          defaultedLoans: 0
        };
      }

      return reputationDoc.data();
    } catch (error) {
      logger.error('Error getting user reputation:', error);
      throw error;
    }
  }

  /**
   * Update last login time
   */
  async updateLastLogin() {
    try {
      await this.update({ lastLoginAt: new Date() });
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Convert to Firestore format
   */
  toFirestore() {
    const data = { ...this };
    delete data.id; // Remove id as it's the document ID
    return data;
  }

  /**
   * Convert to JSON (exclude sensitive data)
   */
  toJSON() {
    const data = { ...this };
    delete data.password; // Never expose password
    return data;
  }

  /**
   * Get public profile data
   */
  getPublicProfile() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      country: this.country,
      occupation: this.occupation,
      profileImage: this.profileImage,
      bio: this.bio,
      createdAt: this.createdAt,
      isVerified: this.isVerified
    };
  }

  /**
   * Check if user can create loan
   */
  canCreateLoan() {
    return this.isVerified && this.kycStatus === 'verified';
  }

  /**
   * Check if user can fund loan
   */
  canFundLoan() {
    return this.isVerified && this.walletAddress;
  }
}

module.exports = User;
