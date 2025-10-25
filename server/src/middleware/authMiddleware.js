const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

/**
 * Authentication middleware
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is malformed or invalid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please login again'
      });
    }
    
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Unable to authenticate user'
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Role-based authorization middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Wallet signature verification middleware
 */
const verifyWalletSignature = async (req, res, next) => {
  try {
    const { signature, message, address } = req.body;
    
    if (!signature || !message || !address) {
      return res.status(400).json({
        error: 'Missing signature data',
        message: 'Signature, message, and address are required'
      });
    }

    // Verify wallet signature
    const isValidSignature = await verifySignature(signature, message, address);
    
    if (!isValidSignature) {
      return res.status(401).json({
        error: 'Invalid signature',
        message: 'Wallet signature verification failed'
      });
    }

    req.walletAddress = address;
    next();
  } catch (error) {
    logger.error('Wallet signature verification error:', error);
    return res.status(401).json({
      error: 'Signature verification failed',
      message: 'Unable to verify wallet signature'
    });
  }
};

/**
 * Verify wallet signature (simplified implementation)
 */
const verifySignature = async (signature, message, address) => {
  try {
    // This is a simplified implementation
    // In a real scenario, you would use a library like ethers.js or web3.js
    // to verify the signature against the message and address
    
    // For now, we'll just check if the signature is a valid hex string
    const isValidHex = /^0x[a-fA-F0-9]+$/.test(signature);
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
    
    return isValidHex && isValidAddress;
  } catch (error) {
    logger.error('Error verifying signature:', error);
    return false;
  }
};

/**
 * Generate JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Hash password
 */
const hashPassword = async (password) => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare password
 */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Generate random nonce for wallet authentication
 */
const generateNonce = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Rate limiting middleware for sensitive operations
 */
const sensitiveOperationRateLimit = (req, res, next) => {
  // Implement rate limiting for sensitive operations
  // This could be enhanced with Redis or memory-based rate limiting
  next();
};

/**
 * KYC verification middleware
 */
const requireKYC = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please login first'
    });
  }

  if (req.user.kycStatus !== 'verified') {
    return res.status(403).json({
      error: 'KYC verification required',
      message: 'Please complete KYC verification to access this feature'
    });
  }

  next();
};

/**
 * Account verification middleware
 */
const requireAccountVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please login first'
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      error: 'Account verification required',
      message: 'Please verify your account to access this feature'
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  authorize,
  verifyWalletSignature,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  generateNonce,
  sensitiveOperationRateLimit,
  requireKYC,
  requireAccountVerification
};
