export const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const calculateInterest = (principal: number, rate: number, days: number): number => {
  return (principal * rate * days) / (100 * 365);
};

export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

export const getTimeRemaining = (dueDate: Date): number => {
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

export const isLoanOverdue = (dueDate: Date): boolean => {
  return new Date() > dueDate;
};