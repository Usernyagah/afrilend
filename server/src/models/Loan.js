const { getFirestore } = require('../config/firestore');
const logger = require('../utils/logger');

/**
 * Loan model for Firestore operations
 */
class Loan {
  constructor(data) {
    this.id = data.id;
    this.borrowerId = data.borrowerId;
    this.amount = data.amount;
    this.fundedAmount = data.fundedAmount || 0;
    this.interestRate = data.interestRate;
    this.duration = data.duration; // in days
    this.purpose = data.purpose;
    this.category = data.category;
    this.description = data.description;
    this.collateral = data.collateral;
    this.status = data.status || 'pending';
    this.lenders = data.lenders || [];
    this.lenderContributions = data.lenderContributions || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.dueDate = data.dueDate;
    this.fundedAt = data.fundedAt;
    this.repaidAt = data.repaidAt;
    this.defaultedAt = data.defaultedAt;
    this.contractAddress = data.contractAddress;
    this.transactionHash = data.transactionHash;
    this.reputationScore = data.reputationScore || 0;
    this.riskLevel = data.riskLevel || 'medium';
    this.tags = data.tags || [];
    this.images = data.images || [];
    this.documents = data.documents || [];
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.views = data.views || 0;
    this.favorites = data.favorites || [];
    this.comments = data.comments || [];
    this.repayments = data.repayments || [];
  }

  /**
   * Create a new loan
   */
  static async create(loanData) {
    try {
      const db = getFirestore();
      const loanRef = db.collection('loans').doc();
      
      const loan = new Loan({
        id: loanRef.id,
        ...loanData,
        createdAt: new Date(),
        updatedAt: new Date(),
        dueDate: new Date(Date.now() + loanData.duration * 24 * 60 * 60 * 1000)
      });

      await loanRef.set(loan.toFirestore());
      
      logger.info(`✅ Loan created: ${loan.id}`);
      return loan;
    } catch (error) {
      logger.error('Error creating loan:', error);
      throw error;
    }
  }

  /**
   * Find loan by ID
   */
  static async findById(loanId) {
    try {
      const db = getFirestore();
      const loanDoc = await db.collection('loans').doc(loanId).get();
      
      if (!loanDoc.exists) {
        return null;
      }

      return new Loan({ id: loanDoc.id, ...loanDoc.data() });
    } catch (error) {
      logger.error('Error finding loan by ID:', error);
      throw error;
    }
  }

  /**
   * Find loans by borrower
   */
  static async findByBorrower(borrowerId, options = {}) {
    try {
      const db = getFirestore();
      let query = db.collection('loans')
        .where('borrowerId', '==', borrowerId)
        .orderBy('createdAt', 'desc');

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const loansSnapshot = await query.get();
      return loansSnapshot.docs.map(doc => new Loan({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding loans by borrower:', error);
      throw error;
    }
  }

  /**
   * Find loans by lender
   */
  static async findByLender(lenderId, options = {}) {
    try {
      const db = getFirestore();
      let query = db.collection('loans')
        .where('lenders', 'array-contains', lenderId)
        .orderBy('createdAt', 'desc');

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const loansSnapshot = await query.get();
      return loansSnapshot.docs.map(doc => new Loan({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding loans by lender:', error);
      throw error;
    }
  }

  /**
   * Find active loans
   */
  static async findActive(options = {}) {
    try {
      const db = getFirestore();
      let query = db.collection('loans')
        .where('status', '==', 'pending')
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc');

      if (options.category) {
        query = query.where('category', '==', options.category);
      }

      if (options.minAmount) {
        query = query.where('amount', '>=', options.minAmount);
      }

      if (options.maxAmount) {
        query = query.where('amount', '<=', options.maxAmount);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const loansSnapshot = await query.get();
      return loansSnapshot.docs.map(doc => new Loan({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding active loans:', error);
      throw error;
    }
  }

  /**
   * Search loans
   */
  static async search(searchOptions) {
    try {
      const db = getFirestore();
      let query = db.collection('loans')
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc');

      if (searchOptions.category) {
        query = query.where('category', '==', searchOptions.category);
      }

      if (searchOptions.minAmount) {
        query = query.where('amount', '>=', searchOptions.minAmount);
      }

      if (searchOptions.maxAmount) {
        query = query.where('amount', '<=', searchOptions.maxAmount);
      }

      if (searchOptions.country) {
        query = query.where('country', '==', searchOptions.country);
      }

      if (searchOptions.riskLevel) {
        query = query.where('riskLevel', '==', searchOptions.riskLevel);
      }

      if (searchOptions.limit) {
        query = query.limit(searchOptions.limit);
      }

      const loansSnapshot = await query.get();
      let loans = loansSnapshot.docs.map(doc => new Loan({ id: doc.id, ...doc.data() }));

      // Filter by text search if provided
      if (searchOptions.query) {
        const searchTerm = searchOptions.query.toLowerCase();
        loans = loans.filter(loan => 
          loan.purpose.toLowerCase().includes(searchTerm) ||
          loan.description.toLowerCase().includes(searchTerm) ||
          loan.category.toLowerCase().includes(searchTerm)
        );
      }

      return loans;
    } catch (error) {
      logger.error('Error searching loans:', error);
      throw error;
    }
  }

  /**
   * Update loan
   */
  async update(updateData) {
    try {
      const db = getFirestore();
      const loanRef = db.collection('loans').doc(this.id);
      
      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      };

      await loanRef.update(updatedData);
      
      // Update local instance
      Object.assign(this, updatedData);
      
      logger.info(`✅ Loan updated: ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Error updating loan:', error);
      throw error;
    }
  }

  /**
   * Fund loan
   */
  async fundLoan(lenderId, amount) {
    try {
      const db = getFirestore();
      const loanRef = db.collection('loans').doc(this.id);
      
      // Add lender to lenders array if not already present
      if (!this.lenders.includes(lenderId)) {
        this.lenders.push(lenderId);
      }

      // Update lender contribution
      this.lenderContributions[lenderId] = (this.lenderContributions[lenderId] || 0) + amount;
      this.fundedAmount += amount;

      // Check if loan is fully funded
      if (this.fundedAmount >= this.amount) {
        this.status = 'active';
        this.fundedAt = new Date();
      }

      await loanRef.update({
        lenders: this.lenders,
        lenderContributions: this.lenderContributions,
        fundedAmount: this.fundedAmount,
        status: this.status,
        fundedAt: this.fundedAt,
        updatedAt: new Date()
      });

      logger.info(`✅ Loan funded: ${this.id} by ${lenderId}`);
      return this;
    } catch (error) {
      logger.error('Error funding loan:', error);
      throw error;
    }
  }

  /**
   * Repay loan
   */
  async repayLoan(amount) {
    try {
      const repaymentAmount = this.calculateRepaymentAmount();
      
      if (amount < repaymentAmount) {
        throw new Error('Insufficient repayment amount');
      }

      await this.update({
        status: 'repaid',
        repaidAt: new Date()
      });

      logger.info(`✅ Loan repaid: ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Error repaying loan:', error);
      throw error;
    }
  }

  /**
   * Default loan
   */
  async defaultLoan() {
    try {
      await this.update({
        status: 'defaulted',
        defaultedAt: new Date()
      });

      logger.info(`❌ Loan defaulted: ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Error defaulting loan:', error);
      throw error;
    }
  }

  /**
   * Calculate repayment amount
   */
  calculateRepaymentAmount() {
    const principal = this.fundedAmount;
    const interest = (principal * this.interestRate * this.duration) / (365 * 100);
    return principal + interest;
  }

  /**
   * Check if loan is fully funded
   */
  isFullyFunded() {
    return this.fundedAmount >= this.amount;
  }

  /**
   * Check if loan is overdue
   */
  isOverdue() {
    return new Date() > this.dueDate && this.status === 'active';
  }

  /**
   * Get loan progress percentage
   */
  getProgressPercentage() {
    return Math.round((this.fundedAmount / this.amount) * 100);
  }

  /**
   * Get days remaining
   */
  getDaysRemaining() {
    const now = new Date();
    const dueDate = new Date(this.dueDate);
    const diffTime = dueDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Increment view count
   */
  async incrementViews() {
    try {
      this.views += 1;
      await this.update({ views: this.views });
    } catch (error) {
      logger.error('Error incrementing views:', error);
      throw error;
    }
  }

  /**
   * Add to favorites
   */
  async addToFavorites(userId) {
    try {
      if (!this.favorites.includes(userId)) {
        this.favorites.push(userId);
        await this.update({ favorites: this.favorites });
      }
    } catch (error) {
      logger.error('Error adding to favorites:', error);
      throw error;
    }
  }

  /**
   * Remove from favorites
   */
  async removeFromFavorites(userId) {
    try {
      this.favorites = this.favorites.filter(id => id !== userId);
      await this.update({ favorites: this.favorites });
    } catch (error) {
      logger.error('Error removing from favorites:', error);
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
   * Convert to JSON
   */
  toJSON() {
    return { ...this };
  }

  /**
   * Get public loan data
   */
  getPublicData() {
    return {
      id: this.id,
      amount: this.amount,
      fundedAmount: this.fundedAmount,
      interestRate: this.interestRate,
      duration: this.duration,
      purpose: this.purpose,
      category: this.category,
      description: this.description,
      status: this.status,
      createdAt: this.createdAt,
      dueDate: this.dueDate,
      reputationScore: this.reputationScore,
      riskLevel: this.riskLevel,
      tags: this.tags,
      images: this.images,
      views: this.views,
      favorites: this.favorites.length,
      progressPercentage: this.getProgressPercentage(),
      daysRemaining: this.getDaysRemaining()
    };
  }
}

module.exports = Loan;
