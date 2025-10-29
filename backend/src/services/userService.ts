import { db, User } from '../config/database';
import { generateId } from '../utils/helpers';
import { validateEmail, validateAccountId, validateName } from '../utils/validators';
import { AppError } from '../middleware/errorHandler';

export const userService = {
  createUser: (data: { accountId: string; name: string; email: string }): User => {
    if (!data.accountId?.trim() || !data.name?.trim() || !data.email?.trim()) {
      throw new AppError('Missing required fields: accountId, name, email', 400);
    }

    if (!validateEmail(data.email)) {
      throw new AppError('Invalid email format', 400);
    }

    if (!validateAccountId(data.accountId)) {
      throw new AppError('Invalid Hedera account ID format (should be 0.0.xxxxx)', 400);
    }

    if (!validateName(data.name)) {
      throw new AppError('Name must be between 3 and 50 characters', 400);
    }

    const existingUser = Array.from(db.users.values()).find(
      (u) => u.accountId === data.accountId || u.email === data.email
    );

    if (existingUser) {
      throw new AppError('User with this account ID or email already exists', 409);
    }

    const userId = generateId('user');
    const user: User = {
      id: userId,
      accountId: data.accountId.trim(),
      name: data.name.trim(),
      email: data.email.trim(),
      reputation: 100,
      totalBorrowed: 0,
      totalRepaid: 0,
      loanCount: 0,
      poolsCreated: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.users.set(userId, user);
    return user;
  },

  getUserById: (userId: string): User | null => {
    return db.users.get(userId) || null;
  },

  getUserByAccountId: (accountId: string): User | null => {
    return Array.from(db.users.values()).find((u) => u.accountId === accountId) || null;
  },

  getAllUsers: (): User[] => {
    return Array.from(db.users.values());
  },

  updateUserReputation: (userId: string, changeAmount: number): User => {
    const user = db.users.get(userId);
    if (!user) throw new AppError('User not found', 404);

    user.reputation = Math.max(0, Math.min(100, user.reputation + changeAmount));
    user.updatedAt = new Date();
    db.users.set(userId, user);
    return user;
  },

  getUserStats: (userId: string) => {
    const user = db.users.get(userId);
    if (!user) throw new AppError('User not found', 404);

    return {
      id: user.id,
      name: user.name,
      reputation: user.reputation,
      totalBorrowed: user.totalBorrowed,
      totalRepaid: user.totalRepaid,
      loanCount: user.loanCount,
      poolsCreated: user.poolsCreated,
      activeLoans: Array.from(db.loans.values()).filter(
        (l) => l.borrowerId === userId && l.status === 'active'
      ).length,
    };
  },
};
