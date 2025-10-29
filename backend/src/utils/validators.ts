export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateAccountId = (accountId: string): boolean => {
  return /^0\.0\.\d+$/.test(accountId);
};

export const validateAmount = (amount: number): boolean => {
  return amount > 0 && Number.isFinite(amount);
};

export const validateInterestRate = (rate: number): boolean => {
  return rate >= 0 && rate <= 100 && Number.isFinite(rate);
};

export const validateDuration = (days: number): boolean => {
  return days > 0 && Number.isInteger(days);
};

export const validateName = (name: string): boolean => {
  return name && name.trim().length > 2 && name.trim().length <= 50;
};