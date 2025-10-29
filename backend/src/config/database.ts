export interface User {
	id: string;
	accountId: string;
	name: string;
	email: string;
	reputation: number;
	totalBorrowed: number;
	totalRepaid: number;
	loanCount: number;
	poolsCreated: number;
	createdAt: Date;
	updatedAt: Date;
}
export interface Loan {
	id: string;
	loanId: string;
	borrowerId: string;
	poolId: string;
	amount: number;
	principalRemaining: number;
	status: 'pending' | 'active' | 'repaid' | 'defaulted';
	interestRate: number;
	createdAt: Date;
	dueDate: Date;
	repaidAt?: Date;
	transactionHash?: string;
}
export interface LenderPool {
	id: string;
	poolId: string;
	poolManager: string;
	poolName: string;
	totalFunded: number;
	availableBalance: number;
	activeLoans: number;
	totalLoansIssued: number;
	createdAt: Date;
	transactionHash?: string;
}
export interface Repayment {
	id: string;
	loanId: string;
	borrowerId: string;
	amount: number;
	interestPaid: number;
	principalPaid: number;
	createdAt: Date;
	transactionHash?: string;
}
export interface PoolFunding {
	id: string;
	poolId: string;
	funderId: string;
	amount: number;
	createdAt: Date;
	transactionHash?: string;
}
export const db = {
	users: new Map<string, User>(),
	loans: new Map<string, Loan>(),
	pools: new Map<string, LenderPool>(),
	repayments: new Array<Repayment>(),
	poolFundings: new Array<PoolFunding>(),
};

