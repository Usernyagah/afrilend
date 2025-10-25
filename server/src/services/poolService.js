const { deployContract, executeContractFunction, callContractFunction } = require('../config/hedera');
const { getCollections } = require('../config/firestore');
const logger = require('../utils/logger');

/**
 * Pool service for blockchain interactions
 */
class PoolService {
  constructor() {
    this.lenderPoolContract = process.env.LENDER_POOL_CONTRACT;
  }

  /**
   * Deploy pool contract on Hedera
   */
  async deployPoolContract(pool) {
    try {
      // In a real implementation, you would deploy the actual contract
      // For now, we'll simulate the deployment
      const contractAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
      
      logger.info(`Pool contract deployed: ${contractAddress} for pool ${pool.id}`);
      return contractAddress;
    } catch (error) {
      logger.error('Failed to deploy pool contract:', error);
      throw error;
    }
  }

  /**
   * Contribute to pool on blockchain
   */
  async contributeToPoolOnBlockchain(poolId, contributorId, amount) {
    try {
      // Call the addLiquidity function on the smart contract
      const result = await executeContractFunction(
        this.lenderPoolContract,
        'addLiquidity',
        [poolId, contributorId, amount]
      );

      logger.info(`Pool contribution on blockchain: ${poolId} by ${contributorId} with ${amount}`);
      return result;
    } catch (error) {
      logger.error('Failed to contribute to pool on blockchain:', error);
      throw error;
    }
  }

  /**
   * Withdraw from pool on blockchain
   */
  async withdrawFromPoolOnBlockchain(poolId, contributorId, amount) {
    try {
      // Call the removeLiquidity function on the smart contract
      const result = await executeContractFunction(
        this.lenderPoolContract,
        'removeLiquidity',
        [poolId, contributorId, amount]
      );

      logger.info(`Pool withdrawal on blockchain: ${poolId} by ${contributorId} with ${amount}`);
      return result;
    } catch (error) {
      logger.error('Failed to withdraw from pool on blockchain:', error);
      throw error;
    }
  }

  /**
   * Distribute yield on blockchain
   */
  async distributeYieldOnBlockchain(poolId, totalYield) {
    try {
      // Call the distributeYield function on the smart contract
      const result = await executeContractFunction(
        this.lenderPoolContract,
        'distributeYield',
        [poolId, totalYield]
      );

      logger.info(`Yield distributed on blockchain: ${poolId} total yield ${totalYield}`);
      return result;
    } catch (error) {
      logger.error('Failed to distribute yield on blockchain:', error);
      throw error;
    }
  }

  /**
   * Get pool details from blockchain
   */
  async getPoolFromBlockchain(poolId) {
    try {
      const result = await callContractFunction(
        this.lenderPoolContract,
        'getPool',
        [poolId]
      );

      return result;
    } catch (error) {
      logger.error('Failed to get pool from blockchain:', error);
      throw error;
    }
  }

  /**
   * Get pool contributors from blockchain
   */
  async getPoolContributorsFromBlockchain(poolId) {
    try {
      const result = await callContractFunction(
        this.lenderPoolContract,
        'getPoolLenders',
        [poolId]
      );

      return result;
    } catch (error) {
      logger.error('Failed to get pool contributors from blockchain:', error);
      throw error;
    }
  }

  /**
   * Get pool analytics
   */
  async getPoolAnalytics(poolId) {
    try {
      const { pools, transactions } = getCollections();
      
      // Get pool data
      const poolDoc = await pools.doc(poolId).get();
      if (!poolDoc.exists) {
        throw new Error('Pool not found');
      }

      const pool = poolDoc.data();

      // Get contribution transactions
      const contributionsSnapshot = await transactions
        .where('poolId', '==', poolId)
        .where('type', '==', 'pool_contribution')
        .get();

      const contributions = contributionsSnapshot.docs.map(doc => doc.data());

      // Get withdrawal transactions
      const withdrawalsSnapshot = await transactions
        .where('poolId', '==', poolId)
        .where('type', '==', 'pool_withdrawal')
        .get();

      const withdrawals = withdrawalsSnapshot.docs.map(doc => doc.data());

      // Calculate analytics
      const totalContributions = contributions.reduce((sum, tx) => sum + tx.amount, 0);
      const totalWithdrawals = withdrawals.reduce((sum, tx) => sum + tx.amount, 0);
      const netContribution = totalContributions - totalWithdrawals;

      const uniqueContributors = new Set(contributions.map(tx => tx.userId)).size;
      const averageContribution = contributions.length > 0 ? totalContributions / contributions.length : 0;

      // Calculate growth rate (monthly)
      const monthlyContributions = {};
      contributions.forEach(tx => {
        const month = new Date(tx.createdAt).toISOString().substring(0, 7);
        monthlyContributions[month] = (monthlyContributions[month] || 0) + tx.amount;
      });

      return {
        poolId,
        totalContributions,
        totalWithdrawals,
        netContribution,
        uniqueContributors,
        averageContribution,
        monthlyContributions,
        completionRate: (pool.currentAmount / pool.targetAmount) * 100,
        createdAt: pool.createdAt,
        lastActivity: pool.updatedAt
      };
    } catch (error) {
      logger.error('Failed to get pool analytics:', error);
      throw error;
    }
  }

  /**
   * Get pool statistics
   */
  async getPoolStatistics() {
    try {
      const { pools } = getCollections();
      
      // Get total pools
      const totalPoolsSnapshot = await pools.get();
      const totalPools = totalPoolsSnapshot.size;

      // Get active pools
      const activePoolsSnapshot = await pools.where('isActive', '==', true).get();
      const activePools = activePoolsSnapshot.size;

      // Get completed pools
      const completedPoolsSnapshot = await pools.where('currentAmount', '>=', pools.where('targetAmount')).get();
      const completedPools = completedPoolsSnapshot.size;

      // Calculate total volume
      let totalVolume = 0;
      let totalContributions = 0;
      
      totalPoolsSnapshot.forEach(doc => {
        const pool = doc.data();
        totalVolume += pool.targetAmount || 0;
        totalContributions += pool.currentAmount || 0;
      });

      // Calculate average pool size
      const averagePoolSize = totalPools > 0 ? totalVolume / totalPools : 0;

      // Calculate completion rate
      const completionRate = totalVolume > 0 ? (totalContributions / totalVolume) * 100 : 0;

      return {
        totalPools,
        activePools,
        completedPools,
        totalVolume,
        totalContributions,
        averagePoolSize,
        completionRate
      };
    } catch (error) {
      logger.error('Failed to get pool statistics:', error);
      throw error;
    }
  }

  /**
   * Get user contributions
   */
  async getUserContributions(userId, options = {}) {
    try {
      const { transactions } = getCollections();
      let query = transactions
        .where('userId', '==', userId)
        .where('type', 'in', ['pool_contribution', 'pool_withdrawal'])
        .orderBy('createdAt', 'desc');

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const transactionsSnapshot = await query.get();
      return transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Failed to get user contributions:', error);
      throw error;
    }
  }

  /**
   * Process pool events from blockchain
   */
  async processPoolEvents(events) {
    try {
      for (const event of events) {
        switch (event.type) {
          case 'PoolCreated':
            await this.handlePoolCreatedEvent(event);
            break;
          case 'LiquidityAdded':
            await this.handleLiquidityAddedEvent(event);
            break;
          case 'LiquidityRemoved':
            await this.handleLiquidityRemovedEvent(event);
            break;
          case 'YieldDistributed':
            await this.handleYieldDistributedEvent(event);
            break;
          default:
            logger.warn(`Unknown pool event type: ${event.type}`);
        }
      }
    } catch (error) {
      logger.error('Failed to process pool events:', error);
      throw error;
    }
  }

  /**
   * Handle pool created event
   */
  async handlePoolCreatedEvent(event) {
    try {
      const { pools } = getCollections();
      const poolRef = pools.doc(event.poolId);
      
      await poolRef.update({
        contractAddress: event.contractAddress,
        transactionHash: event.transactionHash,
        updatedAt: new Date()
      });

      logger.info(`Processed PoolCreated event for pool ${event.poolId}`);
    } catch (error) {
      logger.error('Failed to handle pool created event:', error);
      throw error;
    }
  }

  /**
   * Handle liquidity added event
   */
  async handleLiquidityAddedEvent(event) {
    try {
      const { pools } = getCollections();
      const poolRef = pools.doc(event.poolId);
      
      const poolDoc = await poolRef.get();
      if (poolDoc.exists) {
        const pool = poolDoc.data();
        const contributors = pool.contributors || [];
        const contributorAmounts = pool.contributorAmounts || {};

        if (!contributors.includes(event.lender)) {
          contributors.push(event.lender);
        }

        contributorAmounts[event.lender] = (contributorAmounts[event.lender] || 0) + event.amount;

        await poolRef.update({
          contributors,
          contributorAmounts,
          currentAmount: pool.currentAmount + event.amount,
          updatedAt: new Date()
        });
      }

      logger.info(`Processed LiquidityAdded event for pool ${event.poolId}`);
    } catch (error) {
      logger.error('Failed to handle liquidity added event:', error);
      throw error;
    }
  }

  /**
   * Handle liquidity removed event
   */
  async handleLiquidityRemovedEvent(event) {
    try {
      const { pools } = getCollections();
      const poolRef = pools.doc(event.poolId);
      
      const poolDoc = await poolRef.get();
      if (poolDoc.exists) {
        const pool = poolDoc.data();
        const contributorAmounts = pool.contributorAmounts || {};

        contributorAmounts[event.lender] = Math.max(0, (contributorAmounts[event.lender] || 0) - event.amount);

        await poolRef.update({
          contributorAmounts,
          currentAmount: Math.max(0, pool.currentAmount - event.amount),
          updatedAt: new Date()
        });
      }

      logger.info(`Processed LiquidityRemoved event for pool ${event.poolId}`);
    } catch (error) {
      logger.error('Failed to handle liquidity removed event:', error);
      throw error;
    }
  }

  /**
   * Handle yield distributed event
   */
  async handleYieldDistributedEvent(event) {
    try {
      const { pools } = getCollections();
      const poolRef = pools.doc(event.poolId);
      
      const poolDoc = await poolRef.get();
      if (poolDoc.exists) {
        const pool = poolDoc.data();
        const yieldHistory = pool.yieldHistory || [];

        yieldHistory.push({
          totalYield: event.totalYield,
          distributedAt: new Date(),
          transactionHash: event.transactionHash
        });

        await poolRef.update({
          yieldHistory,
          updatedAt: new Date()
        });
      }

      logger.info(`Processed YieldDistributed event for pool ${event.poolId}`);
    } catch (error) {
      logger.error('Failed to handle yield distributed event:', error);
      throw error;
    }
  }
}

module.exports = new PoolService();
