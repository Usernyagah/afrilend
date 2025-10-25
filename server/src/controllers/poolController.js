const Pool = require('../models/Pool');
const User = require('../models/User');
const poolService = require('../services/poolService');
const { formatSuccessResponse, formatErrorResponse, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Create a new lending pool
 * @route   POST /api/pools
 * @access  Private
 */
const createPool = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Check if user can create pool
  const user = await User.findById(userId);
  if (!user.isVerified) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'User must be verified to create pools'
    });
  }

  const poolData = {
    ...req.body,
    creatorId: userId
  };

  const pool = await Pool.create(poolData);
  
  // Deploy pool on blockchain
  try {
    const contractAddress = await poolService.deployPoolContract(pool);
    await pool.update({ contractAddress });
  } catch (error) {
    logger.error('Failed to deploy pool contract:', error);
    // Continue without blockchain deployment for now
  }

  logger.info(`Pool created: ${pool.id} by user ${userId}`);
  
  res.status(201).json(formatSuccessResponse(
    pool.getPublicData(),
    'Pool created successfully'
  ));
});

/**
 * @desc    Get all pools with filtering and pagination
 * @route   GET /api/pools
 * @access  Public
 */
const getAllPools = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder } = req.query;
  const filters = req.query;

  const pools = await Pool.findActive({
    ...filters,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });

  const totalPools = await Pool.countActive(filters);

  res.json(formatSuccessResponse({
    pools: pools.map(pool => pool.getPublicData()),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalPools,
      pages: Math.ceil(totalPools / parseInt(limit))
    }
  }));
});

/**
 * @desc    Search pools with filters
 * @route   GET /api/pools/search
 * @access  Public
 */
const searchPools = asyncHandler(async (req, res) => {
  const searchOptions = req.query;
  
  const pools = await Pool.search(searchOptions);

  res.json(formatSuccessResponse({
    pools: pools.map(pool => pool.getPublicData()),
    total: pools.length
  }));
});

/**
 * @desc    Get pool by ID
 * @route   GET /api/pools/:id
 * @access  Public
 */
const getPoolById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  // Increment view count
  await pool.incrementViews();

  res.json(formatSuccessResponse(pool.getPublicData()));
});

/**
 * @desc    Contribute to a pool
 * @route   POST /api/pools/:id/contribute
 * @access  Private
 */
const contributeToPool = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const userId = req.user.id;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  if (!pool.isActive) {
    return res.status(400).json({
      error: 'Pool not active',
      message: 'Pool is not accepting contributions'
    });
  }

  if (pool.creatorId === userId) {
    return res.status(400).json({
      error: 'Cannot contribute to own pool',
      message: 'You cannot contribute to your own pool'
    });
  }

  // Check if user can contribute
  const user = await User.findById(userId);
  if (!user.canFundLoan()) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'User must be verified and have a connected wallet to contribute'
    });
  }

  // Contribute to pool on blockchain
  try {
    await poolService.contributeToPoolOnBlockchain(pool.id, userId, amount);
  } catch (error) {
    logger.error('Failed to contribute to pool on blockchain:', error);
    return res.status(500).json({
      error: 'Blockchain transaction failed',
      message: 'Unable to process contribution transaction'
    });
  }

  // Update pool in database
  await pool.addContribution(userId, amount);

  logger.info(`Pool contribution: ${pool.id} by user ${userId} with amount ${amount}`);
  
  res.json(formatSuccessResponse(
    pool.getPublicData(),
    'Contribution successful'
  ));
});

/**
 * @desc    Withdraw from pool
 * @route   POST /api/pools/:id/withdraw
 * @access  Private
 */
const withdrawFromPool = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const userId = req.user.id;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  // Check if user is a contributor
  const contribution = pool.getUserContribution(userId);
  if (!contribution || contribution < amount) {
    return res.status(400).json({
      error: 'Insufficient contribution',
      message: 'You do not have enough contribution to withdraw this amount'
    });
  }

  // Withdraw from pool on blockchain
  try {
    await poolService.withdrawFromPoolOnBlockchain(pool.id, userId, amount);
  } catch (error) {
    logger.error('Failed to withdraw from pool on blockchain:', error);
    return res.status(500).json({
      error: 'Blockchain transaction failed',
      message: 'Unable to process withdrawal transaction'
    });
  }

  // Update pool in database
  await pool.removeContribution(userId, amount);

  logger.info(`Pool withdrawal: ${pool.id} by user ${userId} with amount ${amount}`);
  
  res.json(formatSuccessResponse(
    pool.getPublicData(),
    'Withdrawal successful'
  ));
});

/**
 * @desc    Update pool
 * @route   PUT /api/pools/:id
 * @access  Private
 */
const updatePool = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  if (pool.creatorId !== userId) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'Only the pool creator can update this pool'
    });
  }

  if (pool.currentAmount > 0) {
    return res.status(400).json({
      error: 'Cannot update pool',
      message: 'Pool with contributions cannot be updated'
    });
  }

  await pool.update(req.body);

  res.json(formatSuccessResponse(
    pool.getPublicData(),
    'Pool updated successfully'
  ));
});

/**
 * @desc    Delete pool
 * @route   DELETE /api/pools/:id
 * @access  Private
 */
const deletePool = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  if (pool.creatorId !== userId) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'Only the pool creator can delete this pool'
    });
  }

  if (pool.currentAmount > 0) {
    return res.status(400).json({
      error: 'Cannot delete pool',
      message: 'Pool with contributions cannot be deleted'
    });
  }

  await pool.delete();

  res.json(formatSuccessResponse(
    null,
    'Pool deleted successfully'
  ));
});

/**
 * @desc    Activate pool
 * @route   POST /api/pools/:id/activate
 * @access  Private
 */
const activatePool = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  if (pool.creatorId !== userId) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'Only the pool creator can activate this pool'
    });
  }

  await pool.update({ isActive: true });

  res.json(formatSuccessResponse(
    pool.getPublicData(),
    'Pool activated successfully'
  ));
});

/**
 * @desc    Deactivate pool
 * @route   POST /api/pools/:id/deactivate
 * @access  Private
 */
const deactivatePool = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  if (pool.creatorId !== userId) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'Only the pool creator can deactivate this pool'
    });
  }

  await pool.update({ isActive: false });

  res.json(formatSuccessResponse(
    pool.getPublicData(),
    'Pool deactivated successfully'
  ));
});

/**
 * @desc    Get pools by user
 * @route   GET /api/pools/user/:userId
 * @access  Public
 */
const getPoolsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page, limit } = req.query;

  const pools = await Pool.findByUser(userId, {
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });

  res.json(formatSuccessResponse({
    pools: pools.map(pool => pool.getPublicData()),
    total: pools.length
  }));
});

/**
 * @desc    Get pools by category
 * @route   GET /api/pools/category/:category
 * @access  Public
 */
const getPoolsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { page, limit } = req.query;

  const pools = await Pool.findActive({
    category,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });

  res.json(formatSuccessResponse({
    pools: pools.map(pool => pool.getPublicData()),
    total: pools.length
  }));
});

/**
 * @desc    Get trending pools
 * @route   GET /api/pools/trending
 * @access  Public
 */
const getTrendingPools = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  // Get pools sorted by views and recent activity
  const pools = await Pool.findActive({
    limit: parseInt(limit) || 10,
    sortBy: 'views',
    sortOrder: 'desc'
  });

  res.json(formatSuccessResponse({
    pools: pools.map(pool => pool.getPublicData())
  }));
});

/**
 * @desc    Get featured pools
 * @route   GET /api/pools/featured
 * @access  Public
 */
const getFeaturedPools = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  // Get pools with high completion rates
  const pools = await Pool.findActive({
    limit: parseInt(limit) || 10,
    minCompletionRate: 80
  });

  res.json(formatSuccessResponse({
    pools: pools.map(pool => pool.getPublicData())
  }));
});

/**
 * @desc    Add pool to favorites
 * @route   POST /api/pools/:id/favorite
 * @access  Private
 */
const addToFavorites = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  await pool.addToFavorites(userId);

  res.json(formatSuccessResponse(
    null,
    'Pool added to favorites'
  ));
});

/**
 * @desc    Remove pool from favorites
 * @route   DELETE /api/pools/:id/favorite
 * @access  Private
 */
const removeFromFavorites = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  await pool.removeFromFavorites(userId);

  res.json(formatSuccessResponse(
    null,
    'Pool removed from favorites'
  ));
});

/**
 * @desc    Get pool contributors
 * @route   GET /api/pools/:id/contributors
 * @access  Public
 */
const getPoolContributors = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  // Get contributor details
  const contributors = await Promise.all(
    pool.contributors.map(async (contributorId) => {
      const user = await User.findById(contributorId);
      return {
        id: contributorId,
        contribution: pool.contributorAmounts[contributorId],
        profile: user ? user.getPublicProfile() : null
      };
    })
  );

  res.json(formatSuccessResponse({ contributors }));
});

/**
 * @desc    Get pool contribution history
 * @route   GET /api/pools/:id/contributions
 * @access  Public
 */
const getPoolContributions = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  res.json(formatSuccessResponse({
    contributions: pool.contributionHistory
  }));
});

/**
 * @desc    Get pool yield history
 * @route   GET /api/pools/:id/yield-history
 * @access  Public
 */
const getPoolYieldHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  res.json(formatSuccessResponse({
    yieldHistory: pool.yieldHistory
  }));
});

/**
 * @desc    Distribute yield to contributors
 * @route   POST /api/pools/:id/distribute-yield
 * @access  Private
 */
const distributeYield = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { totalYield } = req.body;
  const userId = req.user.id;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  if (pool.creatorId !== userId) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'Only the pool creator can distribute yield'
    });
  }

  // Distribute yield on blockchain
  try {
    await poolService.distributeYieldOnBlockchain(pool.id, totalYield);
  } catch (error) {
    logger.error('Failed to distribute yield on blockchain:', error);
    return res.status(500).json({
      error: 'Blockchain transaction failed',
      message: 'Unable to process yield distribution'
    });
  }

  // Update pool in database
  await pool.distributeYield(totalYield);

  logger.info(`Yield distributed: ${pool.id} total yield ${totalYield}`);
  
  res.json(formatSuccessResponse(
    pool.getPublicData(),
    'Yield distributed successfully'
  ));
});

/**
 * @desc    Increment pool views
 * @route   POST /api/pools/:id/view
 * @access  Public
 */
const incrementViews = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  await pool.incrementViews();

  res.json(formatSuccessResponse(
    { views: pool.views },
    'View count updated'
  ));
});

/**
 * @desc    Add comment to pool
 * @route   POST /api/pools/:id/comment
 * @access  Private
 */
const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const userId = req.user.id;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  const newComment = {
    id: Date.now().toString(),
    userId,
    comment,
    createdAt: new Date()
  };

  pool.comments.push(newComment);
  await pool.update({ comments: pool.comments });

  res.json(formatSuccessResponse(
    newComment,
    'Comment added successfully'
  ));
});

/**
 * @desc    Get pool comments
 * @route   GET /api/pools/:id/comments
 * @access  Public
 */
const getComments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  // Get commenter details
  const commentsWithUsers = await Promise.all(
    pool.comments.map(async (comment) => {
      const user = await User.findById(comment.userId);
      return {
        ...comment,
        user: user ? user.getPublicProfile() : null
      };
    })
  );

  res.json(formatSuccessResponse({ comments: commentsWithUsers }));
});

/**
 * @desc    Report a pool
 * @route   POST /api/pools/:id/report
 * @access  Private
 */
const reportPool = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, description } = req.body;
  const userId = req.user.id;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  // Create report
  const report = {
    id: Date.now().toString(),
    userId,
    reason,
    description,
    createdAt: new Date()
  };

  // Add report to pool (in a real app, you'd store this separately)
  pool.reports = pool.reports || [];
  pool.reports.push(report);
  await pool.update({ reports: pool.reports });

  res.json(formatSuccessResponse(
    null,
    'Pool reported successfully'
  ));
});

/**
 * @desc    Get pool analytics
 * @route   GET /api/pools/:id/analytics
 * @access  Private
 */
const getPoolAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const pool = await Pool.findById(id);
  if (!pool) {
    return res.status(404).json({
      error: 'Pool not found',
      message: 'The requested pool does not exist'
    });
  }

  if (pool.creatorId !== userId) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'Only the pool creator can view analytics'
    });
  }

  const analytics = await poolService.getPoolAnalytics(pool.id);

  res.json(formatSuccessResponse(analytics));
});

/**
 * @desc    Get pool statistics
 * @route   GET /api/pools/stats/overview
 * @access  Public
 */
const getPoolStats = asyncHandler(async (req, res) => {
  const stats = await poolService.getPoolStatistics();

  res.json(formatSuccessResponse(stats));
});

/**
 * @desc    Get user's pool contributions
 * @route   GET /api/pools/my-contributions
 * @access  Private
 */
const getMyContributions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit } = req.query;

  const contributions = await poolService.getUserContributions(userId, { page, limit });

  res.json(formatSuccessResponse(contributions));
});

/**
 * @desc    Get pools created by user
 * @route   GET /api/pools/my-pools
 * @access  Private
 */
const getMyPools = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit } = req.query;

  const pools = await Pool.findByCreator(userId, {
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });

  res.json(formatSuccessResponse({
    pools: pools.map(pool => pool.getPublicData()),
    total: pools.length
  }));
});

module.exports = {
  createPool,
  getAllPools,
  searchPools,
  getPoolById,
  contributeToPool,
  withdrawFromPool,
  updatePool,
  deletePool,
  activatePool,
  deactivatePool,
  getPoolsByUser,
  getPoolsByCategory,
  getTrendingPools,
  getFeaturedPools,
  addToFavorites,
  removeFromFavorites,
  getPoolContributors,
  getPoolContributions,
  getPoolYieldHistory,
  distributeYield,
  incrementViews,
  addComment,
  getComments,
  reportPool,
  getPoolAnalytics,
  getPoolStats,
  getMyContributions,
  getMyPools
};
