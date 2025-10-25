const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');
const { validateSchema, validateQuery, validateParams } = require('../utils/validator');
const { schemas } = require('../utils/validator');

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route   POST /api/loans
 * @desc    Create a new loan
 * @access  Private
 */
router.post('/', 
  validateSchema(schemas.loanCreation),
  loanController.createLoan
);

/**
 * @route   GET /api/loans
 * @desc    Get all loans with optional filtering
 * @access  Public (with optional auth)
 */
router.get('/',
  optionalAuthMiddleware,
  validateQuery(schemas.pagination),
  loanController.getAllLoans
);

/**
 * @route   GET /api/loans/search
 * @desc    Search loans with filters
 * @access  Public
 */
router.get('/search',
  validateQuery(schemas.search),
  loanController.searchLoans
);

/**
 * @route   GET /api/loans/:id
 * @desc    Get loan by ID
 * @access  Public
 */
router.get('/:id',
  validateParams(schemas.pagination.pick({ id: schemas.pagination.fields.id })),
  loanController.getLoanById
);

/**
 * @route   POST /api/loans/:id/fund
 * @desc    Fund a loan
 * @access  Private
 */
router.post('/:id/fund',
  validateSchema(schemas.loanFunding),
  loanController.fundLoan
);

/**
 * @route   POST /api/loans/:id/repay
 * @desc    Repay a loan
 * @access  Private (borrower only)
 */
router.post('/:id/repay',
  validateSchema(schemas.loanRepayment),
  loanController.repayLoan
);

/**
 * @route   PUT /api/loans/:id
 * @desc    Update loan (borrower only)
 * @access  Private
 */
router.put('/:id',
  loanController.updateLoan
);

/**
 * @route   DELETE /api/loans/:id
 * @desc    Cancel loan (borrower only, if not funded)
 * @access  Private
 */
router.delete('/:id',
  loanController.cancelLoan
);

/**
 * @route   POST /api/loans/:id/favorite
 * @desc    Add loan to favorites
 * @access  Private
 */
router.post('/:id/favorite',
  loanController.addToFavorites
);

/**
 * @route   DELETE /api/loans/:id/favorite
 * @desc    Remove loan from favorites
 * @access  Private
 */
router.delete('/:id/favorite',
  loanController.removeFromFavorites
);

/**
 * @route   GET /api/loans/user/:userId
 * @desc    Get loans by user (borrower or lender)
 * @access  Public
 */
router.get('/user/:userId',
  validateParams(schemas.pagination.pick({ userId: schemas.pagination.fields.userId })),
  loanController.getLoansByUser
);

/**
 * @route   GET /api/loans/category/:category
 * @desc    Get loans by category
 * @access  Public
 */
router.get('/category/:category',
  validateParams(schemas.pagination.pick({ category: schemas.pagination.fields.category })),
  loanController.getLoansByCategory
);

/**
 * @route   GET /api/loans/trending
 * @desc    Get trending loans
 * @access  Public
 */
router.get('/trending',
  validateQuery(schemas.pagination),
  loanController.getTrendingLoans
);

/**
 * @route   GET /api/loans/featured
 * @desc    Get featured loans
 * @access  Public
 */
router.get('/featured',
  validateQuery(schemas.pagination),
  loanController.getFeaturedLoans
);

/**
 * @route   POST /api/loans/:id/view
 * @desc    Increment loan view count
 * @access  Public
 */
router.post('/:id/view',
  loanController.incrementViews
);

/**
 * @route   GET /api/loans/:id/lenders
 * @desc    Get loan lenders
 * @access  Public
 */
router.get('/:id/lenders',
  loanController.getLoanLenders
);

/**
 * @route   GET /api/loans/:id/repayments
 * @desc    Get loan repayment history
 * @access  Private (borrower and lenders only)
 */
router.get('/:id/repayments',
  loanController.getLoanRepayments
);

/**
 * @route   POST /api/loans/:id/comment
 * @desc    Add comment to loan
 * @access  Private
 */
router.post('/:id/comment',
  loanController.addComment
);

/**
 * @route   GET /api/loans/:id/comments
 * @desc    Get loan comments
 * @access  Public
 */
router.get('/:id/comments',
  loanController.getComments
);

/**
 * @route   POST /api/loans/:id/report
 * @desc    Report a loan
 * @access  Private
 */
router.post('/:id/report',
  loanController.reportLoan
);

/**
 * @route   GET /api/loans/stats/overview
 * @desc    Get loan statistics overview
 * @access  Public
 */
router.get('/stats/overview',
  loanController.getLoanStats
);

module.exports = router;
