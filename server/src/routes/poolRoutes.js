const express = require('express');
const router = express.Router();
const poolController = require('../controllers/poolController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');
const { validateSchema, validateQuery, validateParams } = require('../utils/validator');
const { schemas } = require('../utils/validator');

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route   POST /api/pools
 * @desc    Create a new lending pool
 * @access  Private
 */
router.post('/',
  validateSchema(schemas.poolCreation),
  poolController.createPool
);

/**
 * @route   GET /api/pools
 * @desc    Get all pools with optional filtering
 * @access  Public (with optional auth)
 */
router.get('/',
  optionalAuthMiddleware,
  validateQuery(schemas.pagination),
  poolController.getAllPools
);

/**
 * @route   GET /api/pools/search
 * @desc    Search pools with filters
 * @access  Public
 */
router.get('/search',
  validateQuery(schemas.search),
  poolController.searchPools
);

/**
 * @route   GET /api/pools/:id
 * @desc    Get pool by ID
 * @access  Public
 */
router.get('/:id',
  validateParams(schemas.pagination.pick({ id: schemas.pagination.fields.id })),
  poolController.getPoolById
);

/**
 * @route   POST /api/pools/:id/contribute
 * @desc    Contribute to a pool
 * @access  Private
 */
router.post('/:id/contribute',
  validateSchema(schemas.poolContribution),
  poolController.contributeToPool
);

/**
 * @route   POST /api/pools/:id/withdraw
 * @desc    Withdraw from pool
 * @access  Private
 */
router.post('/:id/withdraw',
  poolController.withdrawFromPool
);

/**
 * @route   PUT /api/pools/:id
 * @desc    Update pool (creator only)
 * @access  Private
 */
router.put('/:id',
  poolController.updatePool
);

/**
 * @route   DELETE /api/pools/:id
 * @desc    Delete pool (creator only, if no contributions)
 * @access  Private
 */
router.delete('/:id',
  poolController.deletePool
);

/**
 * @route   POST /api/pools/:id/activate
 * @desc    Activate pool
 * @access  Private (creator only)
 */
router.post('/:id/activate',
  poolController.activatePool
);

/**
 * @route   POST /api/pools/:id/deactivate
 * @desc    Deactivate pool
 * @access  Private (creator only)
 */
router.post('/:id/deactivate',
  poolController.deactivatePool
);

/**
 * @route   GET /api/pools/user/:userId
 * @desc    Get pools by user (creator or contributor)
 * @access  Public
 */
router.get('/user/:userId',
  validateParams(schemas.pagination.pick({ userId: schemas.pagination.fields.userId })),
  poolController.getPoolsByUser
);

/**
 * @route   GET /api/pools/category/:category
 * @desc    Get pools by category
 * @access  Public
 */
router.get('/category/:category',
  validateParams(schemas.pagination.pick({ category: schemas.pagination.fields.category })),
  poolController.getPoolsByCategory
);

/**
 * @route   GET /api/pools/trending
 * @desc    Get trending pools
 * @access  Public
 */
router.get('/trending',
  validateQuery(schemas.pagination),
  poolController.getTrendingPools
);

/**
 * @route   GET /api/pools/featured
 * @desc    Get featured pools
 * @access  Public
 */
router.get('/featured',
  validateQuery(schemas.pagination),
  poolController.getFeaturedPools
);

/**
 * @route   POST /api/pools/:id/favorite
 * @desc    Add pool to favorites
 * @access  Private
 */
router.post('/:id/favorite',
  poolController.addToFavorites
);

/**
 * @route   DELETE /api/pools/:id/favorite
 * @desc    Remove pool from favorites
 * @access  Private
 */
router.delete('/:id/favorite',
  poolController.removeFromFavorites
);

/**
 * @route   GET /api/pools/:id/contributors
 * @desc    Get pool contributors
 * @access  Public
 */
router.get('/:id/contributors',
  poolController.getPoolContributors
);

/**
 * @route   GET /api/pools/:id/contributions
 * @desc    Get pool contribution history
 * @access  Public
 */
router.get('/:id/contributions',
  poolController.getPoolContributions
);

/**
 * @route   GET /api/pools/:id/yield-history
 * @desc    Get pool yield distribution history
 * @access  Public
 */
router.get('/:id/yield-history',
  poolController.getPoolYieldHistory
);

/**
 * @route   POST /api/pools/:id/distribute-yield
 * @desc    Distribute yield to contributors
 * @access  Private (creator only)
 */
router.post('/:id/distribute-yield',
  poolController.distributeYield
);

/**
 * @route   POST /api/pools/:id/view
 * @desc    Increment pool view count
 * @access  Public
 */
router.post('/:id/view',
  poolController.incrementViews
);

/**
 * @route   POST /api/pools/:id/comment
 * @desc    Add comment to pool
 * @access  Private
 */
router.post('/:id/comment',
  poolController.addComment
);

/**
 * @route   GET /api/pools/:id/comments
 * @desc    Get pool comments
 * @access  Public
 */
router.get('/:id/comments',
  poolController.getComments
);

/**
 * @route   POST /api/pools/:id/report
 * @desc    Report a pool
 * @access  Private
 */
router.post('/:id/report',
  poolController.reportPool
);

/**
 * @route   GET /api/pools/:id/analytics
 * @desc    Get pool analytics (creator only)
 * @access  Private
 */
router.get('/:id/analytics',
  poolController.getPoolAnalytics
);

/**
 * @route   GET /api/pools/stats/overview
 * @desc    Get pool statistics overview
 * @access  Public
 */
router.get('/stats/overview',
  poolController.getPoolStats
);

/**
 * @route   GET /api/pools/my-contributions
 * @desc    Get user's pool contributions
 * @access  Private
 */
router.get('/my-contributions',
  validateQuery(schemas.pagination),
  poolController.getMyContributions
);

/**
 * @route   GET /api/pools/my-pools
 * @desc    Get pools created by user
 * @access  Private
 */
router.get('/my-pools',
  validateQuery(schemas.pagination),
  poolController.getMyPools
);

module.exports = router;
