import { db, LenderPool, PoolFunding } from '../config/database';
import { generateId } from '../utils/helpers';
import { validateAmount } from '../utils/validators';
import { userService } from './userService';
import { AppError } from '../middleware/errorHandler';

export const poolService = {
  createPool: (data: {
    poolManager: string;
    poolName: string;
    initialFunding: number;
  }): LenderPool => {
    if (!data.poolManager || !data.poolName?.trim() || data.initialFunding === undefined) {
      throw new AppError('Missing required fields', 400);
    }

    if (!validateAmount(data.initialFunding)) {
      throw new AppError('Initial funding must be a positive number', 400);
    }

    const manager = userService.getUserById(data.poolManager);
    if (!manager) throw new AppError('Pool manager not found', 404);

    const poolId = generateId('pool');
    const pool: LenderPool = {
      id: poolId,
      poolId,
      poolManager: data.poolManager,
      poolName: data.poolName.trim(),
      totalFunded: data.initialFunding,
      availableBalance: data.initialFunding,
      activeLoans: 0,
      totalLoansIssued: 0,
      createdAt: new Date(),
    };

    db.pools.set(poolId, pool);
    manager.poolsCreated += 1;
    manager.updatedAt = new Date();

    const funding: PoolFunding = {
      id: generateId('funding'),
      poolId,
      funderId: data.poolManager,
      amount: data.initialFunding,
      createdAt: new Date(),
    };
    db.poolFundings.push(funding);

    return pool;
  },

  getPoolById: (poolId: string): LenderPool | null => {
    return db.pools.get(poolId) || null;
  },

  getAllPools: (): LenderPool[] => {
    return Array.from(db.pools.values());
  },

  getPoolsByManager: (managerId: string): LenderPool[] => {
    return Array.from(db.pools.values()).filter((pool) => pool.poolManager === managerId);
  },

  fundPool: (poolId: string, funderId: string, amount: number): LenderPool => {
    const pool = db.pools.get(poolId);
    if (!pool) throw new AppError('Pool not found', 404);

    const funder = userService.getUserById(funderId);
    if (!funder) throw new AppError('Funder not found', 404);

    if (!validateAmount(amount)) {
      throw new AppError('Funding amount must be a positive number', 400);
    }

    pool.totalFunded += amount;
    pool.availableBalance += amount;

    const funding: PoolFunding = {
      id: generateId('funding'),
      poolId,
      funderId,
      amount,
      createdAt: new Date(),
    };
    db.poolFundings.push(funding);

    return pool;
  },

  getPoolStats: () => {
    const pools = Array.from(db.pools.values());
    const totalFunded = pools.reduce((sum, p) => sum + p.totalFunded, 0);
    const totalActiveLoans = pools.reduce((sum, p) => sum + p.activeLoans, 0);

    return {
      totalPools: pools.length,
      totalFunded,
      totalActiveLoans,
      totalAvailableBalance: pools.reduce((sum, p) => sum + p.availableBalance, 0),
      averagePoolSize: pools.length > 0 ? totalFunded / pools.length : 0,
      totalLoansIssued: pools.reduce((sum, p) => sum + p.totalLoansIssued, 0),
    };
  },

  getPoolFundings: (poolId: string): PoolFunding[] => {
    return db.poolFundings.filter((f) => f.poolId === poolId);
  },
};