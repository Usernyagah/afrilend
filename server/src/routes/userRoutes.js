const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, optionalAuthMiddleware, requireKYC, requireAccountVerification } = require('../middleware/authMiddleware');
const { validateSchema, validateQuery, validateParams } = require('../utils/validator');
const { schemas } = require('../utils/validator');

/**
 * @route   POST /api/users/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register',
  validateSchema(schemas.userRegistration),
  userController.register
);

/**
 * @route   POST /api/users/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  validateSchema(schemas.userLogin),
  userController.login
);

/**
 * @route   POST /api/users/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout',
  authMiddleware,
  userController.logout
);

/**
 * @route   POST /api/users/refresh-token
 * @desc    Refresh JWT token
 * @access  Public
 */
router.post('/refresh-token',
  userController.refreshToken
);

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile',
  authMiddleware,
  userController.getProfile
);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
  authMiddleware,
  validateSchema(schemas.userProfileUpdate),
  userController.updateProfile
);

/**
 * @route   POST /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password',
  authMiddleware,
  userController.changePassword
);

/**
 * @route   POST /api/users/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password',
  userController.forgotPassword
);

/**
 * @route   POST /api/users/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password',
  userController.resetPassword
);

/**
 * @route   POST /api/users/verify-email
 * @desc    Verify email address
 * @access  Private
 */
router.post('/verify-email',
  authMiddleware,
  userController.verifyEmail
);

/**
 * @route   POST /api/users/resend-verification
 * @desc    Resend email verification
 * @access  Private
 */
router.post('/resend-verification',
  authMiddleware,
  userController.resendVerification
);

/**
 * @route   POST /api/users/kyc/upload
 * @desc    Upload KYC documents
 * @access  Private
 */
router.post('/kyc/upload',
  authMiddleware,
  userController.uploadKYCDocuments
);

/**
 * @route   GET /api/users/kyc/status
 * @desc    Get KYC status
 * @access  Private
 */
router.get('/kyc/status',
  authMiddleware,
  userController.getKYCStatus
);

/**
 * @route   POST /api/users/wallet/connect
 * @desc    Connect wallet address
 * @access  Private
 */
router.post('/wallet/connect',
  authMiddleware,
  userController.connectWallet
);

/**
 * @route   DELETE /api/users/wallet/disconnect
 * @desc    Disconnect wallet address
 * @access  Private
 */
router.delete('/wallet/disconnect',
  authMiddleware,
  userController.disconnectWallet
);

/**
 * @route   GET /api/users/reputation
 * @desc    Get user reputation score
 * @access  Private
 */
router.get('/reputation',
  authMiddleware,
  userController.getReputation
);

/**
 * @route   GET /api/users/loans
 * @desc    Get user's loans (as borrower)
 * @access  Private
 */
router.get('/loans',
  authMiddleware,
  validateQuery(schemas.pagination),
  userController.getUserLoans
);

/**
 * @route   GET /api/users/lending
 * @desc    Get user's lending history
 * @access  Private
 */
router.get('/lending',
  authMiddleware,
  validateQuery(schemas.pagination),
  userController.getUserLending
);

/**
 * @route   GET /api/users/transactions
 * @desc    Get user's transaction history
 * @access  Private
 */
router.get('/transactions',
  authMiddleware,
  validateQuery(schemas.pagination),
  userController.getUserTransactions
);

/**
 * @route   GET /api/users/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get('/notifications',
  authMiddleware,
  validateQuery(schemas.pagination),
  userController.getNotifications
);

/**
 * @route   PUT /api/users/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/notifications/:id/read',
  authMiddleware,
  userController.markNotificationRead
);

/**
 * @route   PUT /api/users/notifications/settings
 * @desc    Update notification settings
 * @access  Private
 */
router.put('/notifications/settings',
  authMiddleware,
  userController.updateNotificationSettings
);

/**
 * @route   GET /api/users/:id/public
 * @desc    Get public user profile
 * @access  Public
 */
router.get('/:id/public',
  validateParams(schemas.pagination.pick({ id: schemas.pagination.fields.id })),
  userController.getPublicProfile
);

/**
 * @route   GET /api/users/:id/reputation
 * @desc    Get public reputation score
 * @access  Public
 */
router.get('/:id/reputation',
  validateParams(schemas.pagination.pick({ id: schemas.pagination.fields.id })),
  userController.getPublicReputation
);

/**
 * @route   POST /api/users/:id/follow
 * @desc    Follow a user
 * @access  Private
 */
router.post('/:id/follow',
  authMiddleware,
  userController.followUser
);

/**
 * @route   DELETE /api/users/:id/follow
 * @desc    Unfollow a user
 * @access  Private
 */
router.delete('/:id/follow',
  authMiddleware,
  userController.unfollowUser
);

/**
 * @route   GET /api/users/:id/followers
 * @desc    Get user's followers
 * @access  Public
 */
router.get('/:id/followers',
  validateParams(schemas.pagination.pick({ id: schemas.pagination.fields.id })),
  validateQuery(schemas.pagination),
  userController.getFollowers
);

/**
 * @route   GET /api/users/:id/following
 * @desc    Get users that this user follows
 * @access  Public
 */
router.get('/:id/following',
  validateParams(schemas.pagination.pick({ id: schemas.pagination.fields.id })),
  validateQuery(schemas.pagination),
  userController.getFollowing
);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account',
  authMiddleware,
  userController.deleteAccount
);

/**
 * @route   POST /api/users/export-data
 * @desc    Export user data
 * @access  Private
 */
router.post('/export-data',
  authMiddleware,
  userController.exportUserData
);

module.exports = router;
