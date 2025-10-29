import { db, Loan } from '../config/database';
import { generateId, calculateInterest, isLoanOverdue } from '../utils/helpers';
import { validateAmount, validateInterestRate, validateDuration } from '../utils/validators';
import { userService } from './userService';
import { AppError } from '../middleware/errorHandler';

export const loanService = {
  createLoan: (data: {
    borrowerId: string;
    poolId: string;
    amount: number;
    interestRate: number;
    durationDays: number;
  }): Loan => {
    if (!data.borrowerId || !data.poolId || !data.amount || data.interestRate === undefined || !data.durationDays) {
      throw new AppError('Missing required fields', 400);
    }

    if (!validateAmount(data.amount)) {
      throw new AppError('Loan amount must be a positive number', 400);
    }

    if (!validateInterestRate(data.interestRate)) {
      throw new AppError('Interest rate must be between 0 and 100%', 400);
    }

    if (!validateDuration(data.durationDays)) {
      throw new AppError('Duration must be a positive integer', 400);
    }

    const borrower = userService.getUserById(data.borrowerId);
    const pool = db.pools.get(data.poolId);

    if (!borrower) throw new AppError('Borrower not found', 404);
    if (!pool) throw new AppError('Lender pool not found', 404);
    if (pool.availableBalance < data.amount) {
      throw new AppError('Insufficient pool balance', 400);
    }

    const loanId = generateId('loan');
    const dueDate = new Date(Date.now() + data.durationDays * 24 * 60 * 60 * 1000);

    const loan: Loan = {
      id: loanId,
      loanId,
      borrowerId: data.borrowerId,
      poolId: data.poolId,
      amount: data.amount,
      principalRemaining: data.amount,
      status: 'active',
      interestRate: data.interestRate,
      createdAt: new Date(),
      dueDate,
    };

    db.loans.set(loanId, loan);

    pool.availableBalance -= data.amount;
    pool.activeLoans += 1;
    pool.totalLoansIssued += 1;

    borrower.loanCount += 1;
    borrower.totalBorrowed += data.amount;
    borrower.updatedAt = new Date();

    return loan;
  },

  getLoanById: (loanId: string): Loan | null => {
    return db.loans.get(loanId) || null;
  },

  getLoansByBorrower: (borrowerId: string): Loan[] => {
    return Array.from(db.loans.values()).filter((loan) => loan.borrowerId === borrowerId);
  },

  getLoansByPool: (poolId: string): Loan[] => {
    return Array.from(db.loans.values()).filter((loan) => loan.poolId === poolId);
  },

  getLoansByStatus: (status: string): Loan[] => {
    return Array.from(db.loans.values()).filter((loan) => loan.status === status);
  },

  getAllLoans: (): Loan[] => {
    return Array.from(db.loans.values());
  },

  repayLoan: (loanId: string, repayAmount: number): { loan: Loan; interest: number; principalPaid: number } => {
    const loan = db.loans.get(loanId);
    if (!loan) throw new AppError('Loan not found', 404);
    if (loan.status === 'repaid') throw new AppError('Loan already repaid', 400);

    const daysElapsed = Math.floor((Date.now() - loan.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const interest = calculateInterest(loan.amount, loan.interestRate, daysElapsed);
    const totalDue = loan.principalRemaining + interest;

    if (repayAmount < totalDue) {
      throw new AppError(
        `Insufficient repayment amount. Required: ${totalDue.toFixed(2)}, Provided: ${repayAmount.toFixed(2)}`,
        400
      );
    }

    const principalPaid = loan.principalRemaining;
    loan.principalRemaining = 0;
    loan.status = 'repaid';
    loan.repaidAt = new Date();

    const borrower = userService.getUserById(loan.borrowerId);
    const pool = db.pools.get(loan.poolId);

    if (borrower) {
      borrower.totalRepaid += repayAmount;
      userService.updateUserReputation(borrower.id, 5);
    }

    if (pool) {
      pool.activeLoans = Math.max(0, pool.activeLoans - 1);
      pool.availableBalance += principalPaid + interest;
    }

    const repayment: any = {
      id: generateId('repay'),
      loanId,
      borrowerId: loan.borrowerId,
      amount: repayAmount,
      interestPaid: interest,
      principalPaid,
      createdAt: new Date(),
    };
    db.repayments.push(repayment);

    return { loan, interest, principalPaid };
  },

  getActiveLoanCount: (): number => {
    return Array.from(db.loans.values()).filter((l) => l.status === 'active').length;
  },

  getTotalLoanAmount: (): number => {
    return Array.from(db.loans.values()).reduce((sum, l) => sum + l.amount, 0);
  },
};