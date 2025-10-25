const { deployContract, executeContractFunction, callContractFunction } = require('../config/hedera');
const { getCollections } = require('../config/firestore');
const logger = require('../utils/logger');

/**
 * Loan service for blockchain interactions
 */
class LoanService {
  constructor() {
    this.loanManagerContract = process.env.AFRILEND_LOAN_MANAGER_CONTRACT;
  }

  /**
   * Deploy loan contract on Hedera
   */
  async deployLoanContract(loan) {
    try {
      // In a real implementation, you would deploy the actual contract
      // For now, we'll simulate the deployment
      const contractAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
      
      logger.info(`Loan contract deployed: ${contractAddress} for loan ${loan.id}`);
      return contractAddress;
    } catch (error) {
      logger.error('Failed to deploy loan contract:', error);
      throw error;
    }
  }

  /**
   * Fund loan on blockchain
   */
  async fundLoanOnBlockchain(loanId, lenderId, amount) {
    try {
      // Call the fundLoan function on the smart contract
      const result = await executeContractFunction(
        this.loanManagerContract,
        'fundLoan',
        [loanId, lenderId, amount]
      );

      logger.info(`Loan funded on blockchain: ${loanId} by ${lenderId} with ${amount}`);
      return result;
    } catch (error) {
      logger.error('Failed to fund loan on blockchain:', error);
      throw error;
    }
  }

  /**
   * Repay loan on blockchain
   */
  async repayLoanOnBlockchain(loanId, borrowerId, amount) {
    try {
      // Call the repayLoan function on the smart contract
      const result = await executeContractFunction(
        this.loanManagerContract,
        'repayLoan',
        [loanId, borrowerId, amount]
      );

      logger.info(`Loan repaid on blockchain: ${loanId} by ${borrowerId} with ${amount}`);
      return result;
    } catch (error) {
      logger.error('Failed to repay loan on blockchain:', error);
      throw error;
    }
  }

  /**
   * Get loan details from blockchain
   */
  async getLoanFromBlockchain(loanId) {
    try {
      const result = await callContractFunction(
        this.loanManagerContract,
        'getLoan',
        [loanId]
      );

      return result;
    } catch (error) {
      logger.error('Failed to get loan from blockchain:', error);
      throw error;
    }
  }

  /**
   * Check if loan is fully funded on blockchain
   */
  async isLoanFullyFundedOnBlockchain(loanId) {
    try {
      const result = await callContractFunction(
        this.loanManagerContract,
        'isLoanFullyFunded',
        [loanId]
      );

      return result;
    } catch (error) {
      logger.error('Failed to check loan funding status:', error);
      throw error;
    }
  }

  /**
   * Calculate repayment amount from blockchain
   */
  async calculateRepaymentAmountFromBlockchain(loanId) {
    try {
      const result = await callContractFunction(
        this.loanManagerContract,
        'calculateRepaymentAmount',
        [loanId]
      );

      return result;
    } catch (error) {
      logger.error('Failed to calculate repayment amount:', error);
      throw error;
    }
  }

  /**
   * Get loan statistics
   */
  async getLoanStatistics() {
    try {
      const { loans } = getCollections();
      
      // Get total loans
      const totalLoansSnapshot = await loans.get();
      const totalLoans = totalLoansSnapshot.size;

      // Get active loans
      const activeLoansSnapshot = await loans.where('status', '==', 'pending').get();
      const activeLoans = activeLoansSnapshot.size;

      // Get funded loans
      const fundedLoansSnapshot = await loans.where('status', '==', 'active').get();
      const fundedLoans = fundedLoansSnapshot.size;

      // Get repaid loans
      const repaidLoansSnapshot = await loans.where('status', '==', 'repaid').get();
      const repaidLoans = repaidLoansSnapshot.size;

      // Get defaulted loans
      const defaultedLoansSnapshot = await loans.where('status', '==', 'defaulted').get();
      const defaultedLoans = defaultedLoansSnapshot.size;

      // Calculate total volume
      let totalVolume = 0;
      totalLoansSnapshot.forEach(doc => {
        const loan = doc.data();
        totalVolume += loan.amount || 0;
      });

      // Calculate funded volume
      let fundedVolume = 0;
      fundedLoansSnapshot.forEach(doc => {
        const loan = doc.data();
        fundedVolume += loan.fundedAmount || 0;
      });

      return {
        totalLoans,
        activeLoans,
        fundedLoans,
        repaidLoans,
        defaultedLoans,
        totalVolume,
        fundedVolume,
        successRate: totalLoans > 0 ? (repaidLoans / totalLoans) * 100 : 0,
        defaultRate: totalLoans > 0 ? (defaultedLoans / totalLoans) * 100 : 0
      };
    } catch (error) {
      logger.error('Failed to get loan statistics:', error);
      throw error;
    }
  }

  /**
   * Process loan events from blockchain
   */
  async processLoanEvents(events) {
    try {
      for (const event of events) {
        switch (event.type) {
          case 'LoanCreated':
            await this.handleLoanCreatedEvent(event);
            break;
          case 'LoanFunded':
            await this.handleLoanFundedEvent(event);
            break;
          case 'LoanRepaid':
            await this.handleLoanRepaidEvent(event);
            break;
          case 'LoanDefaulted':
            await this.handleLoanDefaultedEvent(event);
            break;
          default:
            logger.warn(`Unknown loan event type: ${event.type}`);
        }
      }
    } catch (error) {
      logger.error('Failed to process loan events:', error);
      throw error;
    }
  }

  /**
   * Handle loan created event
   */
  async handleLoanCreatedEvent(event) {
    try {
      const { loans } = getCollections();
      const loanRef = loans.doc(event.loanId);
      
      await loanRef.update({
        contractAddress: event.contractAddress,
        transactionHash: event.transactionHash,
        updatedAt: new Date()
      });

      logger.info(`Processed LoanCreated event for loan ${event.loanId}`);
    } catch (error) {
      logger.error('Failed to handle loan created event:', error);
      throw error;
    }
  }

  /**
   * Handle loan funded event
   */
  async handleLoanFundedEvent(event) {
    try {
      const { loans } = getCollections();
      const loanRef = loans.doc(event.loanId);
      
      const loanDoc = await loanRef.get();
      if (loanDoc.exists) {
        const loan = loanDoc.data();
        const lenders = loan.lenders || [];
        const lenderContributions = loan.lenderContributions || {};

        if (!lenders.includes(event.lender)) {
          lenders.push(event.lender);
        }

        lenderContributions[event.lender] = (lenderContributions[event.lender] || 0) + event.amount;

        await loanRef.update({
          lenders,
          lenderContributions,
          fundedAmount: loan.fundedAmount + event.amount,
          updatedAt: new Date()
        });
      }

      logger.info(`Processed LoanFunded event for loan ${event.loanId}`);
    } catch (error) {
      logger.error('Failed to handle loan funded event:', error);
      throw error;
    }
  }

  /**
   * Handle loan repaid event
   */
  async handleLoanRepaidEvent(event) {
    try {
      const { loans } = getCollections();
      const loanRef = loans.doc(event.loanId);
      
      await loanRef.update({
        status: 'repaid',
        repaidAt: new Date(),
        transactionHash: event.transactionHash,
        updatedAt: new Date()
      });

      logger.info(`Processed LoanRepaid event for loan ${event.loanId}`);
    } catch (error) {
      logger.error('Failed to handle loan repaid event:', error);
      throw error;
    }
  }

  /**
   * Handle loan defaulted event
   */
  async handleLoanDefaultedEvent(event) {
    try {
      const { loans } = getCollections();
      const loanRef = loans.doc(event.loanId);
      
      await loanRef.update({
        status: 'defaulted',
        defaultedAt: new Date(),
        transactionHash: event.transactionHash,
        updatedAt: new Date()
      });

      logger.info(`Processed LoanDefaulted event for loan ${event.loanId}`);
    } catch (error) {
      logger.error('Failed to handle loan defaulted event:', error);
      throw error;
    }
  }
}

module.exports = new LoanService();
