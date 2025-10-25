const User = require('../models/User');
const userService = require('../services/userService');
const { formatSuccessResponse, formatErrorResponse, asyncHandler } = require('../middleware/errorHandler');
const { generateToken, generateRefreshToken, hashPassword, comparePassword } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

/**
 * @desc    Register a new user
 * @route   POST /api/users/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phoneNumber, country, dateOfBirth, occupation, monthlyIncome } = req.body;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return res.status(400).json({
      error: 'User already exists',
      message: 'An account with this email already exists'
    });
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const userData = {
    email,
    password: hashedPassword,
    firstName,
    lastName,
    phoneNumber,
    country,
    dateOfBirth,
    occupation,
    monthlyIncome,
    kycStatus: 'pending',
    isVerified: false
  };

  const user = await User.create(userData);

  // Generate tokens
  const token = generateToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id });

  // Send verification email
  try {
    await userService.sendVerificationEmail(user);
  } catch (error) {
    logger.error('Failed to send verification email:', error);
  }

  logger.info(`User registered: ${user.id}`);

  res.status(201).json(formatSuccessResponse({
    user: user.toJSON(),
    token,
    refreshToken
  }, 'User registered successfully'));
});

/**
 * @desc    Login user
 * @route   POST /api/users/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(401).json({
      error: 'Invalid credentials',
      message: 'Email or password is incorrect'
    });
  }

  // Check password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      error: 'Invalid credentials',
      message: 'Email or password is incorrect'
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(401).json({
      error: 'Account disabled',
      message: 'Your account has been disabled. Please contact support.'
    });
  }

  // Update last login
  await user.updateLastLogin();

  // Generate tokens
  const token = generateToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id });

  logger.info(`User logged in: ${user.id}`);

  res.json(formatSuccessResponse({
    user: user.toJSON(),
    token,
    refreshToken
  }, 'Login successful'));
});

/**
 * @desc    Logout user
 * @route   POST /api/users/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // In a real implementation, you would invalidate the token
  // For now, we'll just return success
  res.json(formatSuccessResponse(null, 'Logout successful'));
});

/**
 * @desc    Refresh JWT token
 * @route   POST /api/users/refresh-token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      error: 'Refresh token required',
      message: 'Please provide a refresh token'
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'User not found'
      });
    }

    const newToken = generateToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user.id });

    res.json(formatSuccessResponse({
      token: newToken,
      refreshToken: newRefreshToken
    }, 'Token refreshed successfully'));
  } catch (error) {
    res.status(401).json({
      error: 'Invalid refresh token',
      message: 'Refresh token is invalid or expired'
    });
  }
});

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  // Get reputation score
  const reputation = await user.getReputationScore();

  res.json(formatSuccessResponse({
    user: user.toJSON(),
    reputation
  }));
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  await user.update(req.body);

  res.json(formatSuccessResponse(
    user.toJSON(),
    'Profile updated successfully'
  ));
});

/**
 * @desc    Change user password
 * @route   POST /api/users/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  // Verify current password
  const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      error: 'Invalid current password',
      message: 'Current password is incorrect'
    });
  }

  // Hash new password
  const hashedNewPassword = await hashPassword(newPassword);
  await user.update({ password: hashedNewPassword });

  res.json(formatSuccessResponse(null, 'Password changed successfully'));
});

/**
 * @desc    Request password reset
 * @route   POST /api/users/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findByEmail(email);
  if (!user) {
    // Don't reveal if email exists
    return res.json(formatSuccessResponse(null, 'If the email exists, a reset link has been sent'));
  }

  // Generate reset token
  const resetToken = generateToken({ id: user.id }, '1h');
  
  // Send reset email
  try {
    await userService.sendPasswordResetEmail(user, resetToken);
  } catch (error) {
    logger.error('Failed to send password reset email:', error);
  }

  res.json(formatSuccessResponse(null, 'If the email exists, a reset link has been sent'));
});

/**
 * @desc    Reset password with token
 * @route   POST /api/users/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Password reset token is invalid'
      });
    }

    const hashedPassword = await hashPassword(newPassword);
    await user.update({ password: hashedPassword });

    res.json(formatSuccessResponse(null, 'Password reset successfully'));
  } catch (error) {
    res.status(400).json({
      error: 'Invalid token',
      message: 'Password reset token is invalid or expired'
    });
  }
});

/**
 * @desc    Verify email address
 * @route   POST /api/users/verify-email
 * @access  Private
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  if (user.isVerified) {
    return res.status(400).json({
      error: 'Already verified',
      message: 'Email is already verified'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id !== userId) {
      throw new Error('Invalid token');
    }

    await user.update({ isVerified: true });
    res.json(formatSuccessResponse(null, 'Email verified successfully'));
  } catch (error) {
    res.status(400).json({
      error: 'Invalid token',
      message: 'Email verification token is invalid or expired'
    });
  }
});

/**
 * @desc    Resend email verification
 * @route   POST /api/users/resend-verification
 * @access  Private
 */
const resendVerification = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  if (user.isVerified) {
    return res.status(400).json({
      error: 'Already verified',
      message: 'Email is already verified'
    });
  }

  try {
    await userService.sendVerificationEmail(user);
    res.json(formatSuccessResponse(null, 'Verification email sent'));
  } catch (error) {
    logger.error('Failed to send verification email:', error);
    res.status(500).json({
      error: 'Email sending failed',
      message: 'Unable to send verification email'
    });
  }
});

/**
 * @desc    Upload KYC documents
 * @route   POST /api/users/kyc/upload
 * @access  Private
 */
const uploadKYCDocuments = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { documents } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  // Update KYC status to pending
  await user.update({ 
    kycStatus: 'pending',
    kycDocuments: documents
  });

  res.json(formatSuccessResponse(null, 'KYC documents uploaded successfully'));
});

/**
 * @desc    Get KYC status
 * @route   GET /api/users/kyc/status
 * @access  Private
 */
const getKYCStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  res.json(formatSuccessResponse({
    kycStatus: user.kycStatus,
    kycDocuments: user.kycDocuments || []
  }));
});

/**
 * @desc    Connect wallet address
 * @route   POST /api/users/wallet/connect
 * @access  Private
 */
const connectWallet = asyncHandler(async (req, res) => {
  const { walletAddress } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  // Check if wallet is already connected to another account
  const existingUser = await User.findByWalletAddress(walletAddress);
  if (existingUser && existingUser.id !== userId) {
    return res.status(400).json({
      error: 'Wallet already connected',
      message: 'This wallet address is already connected to another account'
    });
  }

  await user.update({ walletAddress });

  res.json(formatSuccessResponse(null, 'Wallet connected successfully'));
});

/**
 * @desc    Disconnect wallet address
 * @route   DELETE /api/users/wallet/disconnect
 * @access  Private
 */
const disconnectWallet = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  await user.update({ walletAddress: null });

  res.json(formatSuccessResponse(null, 'Wallet disconnected successfully'));
});

/**
 * @desc    Get user reputation
 * @route   GET /api/users/reputation
 * @access  Private
 */
const getReputation = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  const reputation = await user.getReputationScore();

  res.json(formatSuccessResponse(reputation));
});

/**
 * @desc    Get user's loans
 * @route   GET /api/users/loans
 * @access  Private
 */
const getUserLoans = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit } = req.query;

  const loans = await user.getLoans();

  res.json(formatSuccessResponse({
    loans: loans.map(loan => loan.getPublicData()),
    total: loans.length
  }));
});

/**
 * @desc    Get user's lending history
 * @route   GET /api/users/lending
 * @access  Private
 */
const getUserLending = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const lendingHistory = await user.getLendingHistory();

  res.json(formatSuccessResponse({
    lendingHistory: lendingHistory.map(loan => loan.getPublicData()),
    total: lendingHistory.length
  }));
});

/**
 * @desc    Get user's transactions
 * @route   GET /api/users/transactions
 * @access  Private
 */
const getUserTransactions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit } = req.query;

  const transactions = await userService.getUserTransactions(userId, { page, limit });

  res.json(formatSuccessResponse(transactions));
});

/**
 * @desc    Get user's notifications
 * @route   GET /api/users/notifications
 * @access  Private
 */
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit } = req.query;

  const notifications = await userService.getUserNotifications(userId, { page, limit });

  res.json(formatSuccessResponse(notifications));
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/users/notifications/:id/read
 * @access  Private
 */
const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  await userService.markNotificationRead(userId, id);

  res.json(formatSuccessResponse(null, 'Notification marked as read'));
});

/**
 * @desc    Update notification settings
 * @route   PUT /api/users/notifications/settings
 * @access  Private
 */
const updateNotificationSettings = asyncHandler(async (req, res) => {
  const { settings } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  await user.update({ notificationSettings: settings });

  res.json(formatSuccessResponse(null, 'Notification settings updated'));
});

/**
 * @desc    Get public user profile
 * @route   GET /api/users/:id/public
 * @access  Public
 */
const getPublicProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  res.json(formatSuccessResponse(user.getPublicProfile()));
});

/**
 * @desc    Get public reputation score
 * @route   GET /api/users/:id/reputation
 * @access  Public
 */
const getPublicReputation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  const reputation = await user.getReputationScore();

  res.json(formatSuccessResponse(reputation));
});

/**
 * @desc    Follow a user
 * @route   POST /api/users/:id/follow
 * @access  Private
 */
const followUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (id === userId) {
    return res.status(400).json({
      error: 'Cannot follow yourself',
      message: 'You cannot follow yourself'
    });
  }

  await userService.followUser(userId, id);

  res.json(formatSuccessResponse(null, 'User followed successfully'));
});

/**
 * @desc    Unfollow a user
 * @route   DELETE /api/users/:id/follow
 * @access  Private
 */
const unfollowUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  await userService.unfollowUser(userId, id);

  res.json(formatSuccessResponse(null, 'User unfollowed successfully'));
});

/**
 * @desc    Get user's followers
 * @route   GET /api/users/:id/followers
 * @access  Public
 */
const getFollowers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page, limit } = req.query;

  const followers = await userService.getUserFollowers(id, { page, limit });

  res.json(formatSuccessResponse(followers));
});

/**
 * @desc    Get users that this user follows
 * @route   GET /api/users/:id/following
 * @access  Public
 */
const getFollowing = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page, limit } = req.query;

  const following = await userService.getUserFollowing(id, { page, limit });

  res.json(formatSuccessResponse(following));
});

/**
 * @desc    Delete user account
 * @route   DELETE /api/users/account
 * @access  Private
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'User profile not found'
    });
  }

  await user.delete();

  res.json(formatSuccessResponse(null, 'Account deleted successfully'));
});

/**
 * @desc    Export user data
 * @route   POST /api/users/export-data
 * @access  Private
 */
const exportUserData = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const userData = await userService.exportUserData(userId);

  res.json(formatSuccessResponse(userData));
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  uploadKYCDocuments,
  getKYCStatus,
  connectWallet,
  disconnectWallet,
  getReputation,
  getUserLoans,
  getUserLending,
  getUserTransactions,
  getNotifications,
  markNotificationRead,
  updateNotificationSettings,
  getPublicProfile,
  getPublicReputation,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  deleteAccount,
  exportUserData
};
