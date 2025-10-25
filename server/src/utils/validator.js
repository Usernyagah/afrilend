const Joi = require('joi');
const { validationResult } = require('express-validator');

/**
 * Validation schemas for different entities
 */
const schemas = {
  // User validation schemas
  userRegistration: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phoneNumber: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
    country: Joi.string().min(2).max(50).required(),
    walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
    dateOfBirth: Joi.date().max('now').required(),
    occupation: Joi.string().min(2).max(100).required(),
    monthlyIncome: Joi.number().min(0).optional(),
    kycStatus: Joi.string().valid('pending', 'verified', 'rejected').default('pending')
  }),

  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  userProfileUpdate: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phoneNumber: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).optional(),
    country: Joi.string().min(2).max(50).optional(),
    occupation: Joi.string().min(2).max(100).optional(),
    monthlyIncome: Joi.number().min(0).optional(),
    bio: Joi.string().max(500).optional(),
    profileImage: Joi.string().uri().optional()
  }),

  // Loan validation schemas
  loanCreation: Joi.object({
    amount: Joi.number().min(0.01).max(100).required(),
    interestRate: Joi.number().min(5).max(50).required(),
    duration: Joi.number().min(30).max(365).required(), // days
    purpose: Joi.string().min(10).max(500).required(),
    category: Joi.string().valid('business', 'education', 'health', 'agriculture', 'housing', 'other').required(),
    description: Joi.string().min(20).max(1000).required(),
    collateral: Joi.object({
      type: Joi.string().valid('property', 'vehicle', 'equipment', 'other').optional(),
      value: Joi.number().min(0).optional(),
      description: Joi.string().max(200).optional()
    }).optional()
  }),

  loanFunding: Joi.object({
    loanId: Joi.string().required(),
    amount: Joi.number().min(0.01).required(),
    message: Joi.string().max(200).optional()
  }),

  loanRepayment: Joi.object({
    loanId: Joi.string().required(),
    amount: Joi.number().min(0.01).required(),
    paymentMethod: Joi.string().valid('wallet', 'bank_transfer', 'mobile_money').required()
  }),

  // Pool validation schemas
  poolCreation: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().min(20).max(500).required(),
    targetAmount: Joi.number().min(1).max(1000).required(),
    interestRate: Joi.number().min(3).max(25).required(),
    category: Joi.string().valid('agriculture', 'small_business', 'education', 'health', 'general').required(),
    riskLevel: Joi.string().valid('low', 'medium', 'high').required(),
    duration: Joi.number().min(30).max(365).required() // days
  }),

  poolContribution: Joi.object({
    poolId: Joi.string().required(),
    amount: Joi.number().min(0.01).required()
  }),

  // Transaction validation schemas
  transaction: Joi.object({
    from: Joi.string().required(),
    to: Joi.string().required(),
    amount: Joi.number().min(0.01).required(),
    type: Joi.string().valid('loan_funding', 'loan_repayment', 'pool_contribution', 'pool_withdrawal', 'fee_payment').required(),
    description: Joi.string().max(200).optional(),
    metadata: Joi.object().optional()
  }),

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Search validation
  search: Joi.object({
    query: Joi.string().min(1).max(100).required(),
    category: Joi.string().optional(),
    minAmount: Joi.number().min(0).optional(),
    maxAmount: Joi.number().min(0).optional(),
    country: Joi.string().optional(),
    riskLevel: Joi.string().valid('low', 'medium', 'high').optional()
  })
};

/**
 * Middleware to validate request body using Joi schema
 */
const validateSchema = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Validation Error',
        details: errorMessages
      });
    }
    
    req.body = value;
    next();
  };
};

/**
 * Middleware to validate request query parameters
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Query Validation Error',
        details: errorMessages
      });
    }
    
    req.query = value;
    next();
  };
};

/**
 * Middleware to validate request parameters
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, { abortEarly: false });
    
    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Parameter Validation Error',
        details: errorMessages
      });
    }
    
    req.params = value;
    next();
  };
};

/**
 * Handle express-validator errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Sanitize input data
 */
const sanitizeInput = (data) => {
  if (typeof data === 'string') {
    return data.trim().replace(/[<>]/g, '');
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
};

/**
 * Validate Ethereum address
 */
const isValidEthereumAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate Hedera account ID
 */
const isValidHederaAccountId = (accountId) => {
  return /^\d+\.\d+\.\d+$/.test(accountId);
};

/**
 * Validate phone number (international format)
 */
const isValidPhoneNumber = (phoneNumber) => {
  return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
};

/**
 * Validate email address
 */
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

module.exports = {
  schemas,
  validateSchema,
  validateQuery,
  validateParams,
  handleValidationErrors,
  sanitizeInput,
  isValidEthereumAddress,
  isValidHederaAccountId,
  isValidPhoneNumber,
  isValidEmail
};
