const Loan = require('../models/Loan');
const User = require('../models/User');
const loanService = require('../services/loanService');
const { formatSuccessResponse, formatErrorResponse, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Create a new loan
 * @route   POST /api/loans
 * @access  Private
 */
const createLoan = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Check if user can create loan
  const user = await User.findById(userId);
  if (!user.canCreateLoan()) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'User must be verified and have completed KYC to create loans'
    });
  }

  const loanData = {
    ...req.body,
    borrowerId: userId,
    reputationScore: user.reputationScore || 100
  };

  const loan = await Loan.create(loanData);
  
  // Deploy loan on blockchain
  try {
    const contractAddress = await loanService.deployLoanContract(loan);
    await loan.update({ contractAddress });
  } catch (error) {
    logger.error('Failed to deploy loan contract:', error);
    // Continue without blockchain deployment for now
  }

  logger.info(`Loan created: ${loan.id} by user ${userId}`);
  
  res.status(201).json(formatSuccessResponse(
    loan.getPublicData(),
    'Loan created successfully'
  ));
});

/**
 * @desc    Get all loans with filtering and pagination
 * @route   GET /api/loans
 * @access  Public
 */
const getAllLoans = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder } = req.query;
  const filters = req.query;

  const loans = await Loan.findActive({
    ...filters,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });

  const totalLoans = await Loan.countActive(filters);

  res.json(formatSuccessResponse({
    loans: loans.map(loan => loan.getPublicData()),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalLoans,
      pages: Math.ceil(totalLoans / parseInt(limit))
    }
  }));
});

/**
 * @desc    Search loans with filters
 * @route   GET /api/loans/search
 * @access  Public
 */
const searchLoans = asyncHandler(async (req, res) => {
  const searchOptions = req.query;
  
  const loans = await Loan.search(searchOptions);

  res.json(formatSuccessResponse({
    loans: loans.map(loan => loan.getPublicData()),
    total: loans.length
  }));
});

/**
 * @desc    Get loan by ID
 * @route   GET /api/loans/:id
 * @access  Public
 */
const getLoanById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const loan = await Loan.findById(id);
  if (!loan) {
    return res.status(404).json({
      error: 'Loan not found',
      message: 'The requested loan does not exist'
    });
  }

  // Increment view count
  await loan.incrementViews();

  res.json(formatSuccessResponse(loan.getPublicData()));
});

/**
 * @desc    Fund a loan
 * @route   POST /api/loans/:id/fund
 * @access  Private
 */
const fundLoan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const userId = req.user.id;

  const loan = await Loan.findById(id);
  if (!loan) {
    return res.status(404).json({
      error: 'Loan not found',
      message: 'The requested loan does not exist'
    });
  }

  if (loan.status !== 'pending') {
    return res.status(400).json({
      error: 'Invalid loan status',
      message: 'Loan is not available for funding'
    });
  }

  if (loan.borrowerId === userId) {
    return res.status(400).json({
      error: 'Cannot fund own loan',
      message: 'You cannot fund your own loan'
    });
  }

  // Check if user can fund loan
  const user = await User.findById(userId);
  if (!user.canFundLoan()) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'User must be verified and have a connected wallet to fund loans'
    });
  }

  // Fund loan on blockchain
  try {
    await loanService.fundLoanOnBlockchain(loan.id, userId, amount);
  } catch (error) {
    logger.error('Failed to fund loan on blockchain:', error);
    return res.status(500).json({
      error: 'Blockchain transaction failed',
      message: 'Unable to process funding transaction'
    });
  }

  // Update loan in database
  await loan.fundLoan(userId, amount);

  logger.info(`Loan funded: ${loan.id} by user ${userId} with amount ${amount}`);
  
  res.json(formatSuccessResponse(
    loan.getPublicData(),
    'Loan funded successfully'
  ));
});

/**
 * @desc    Repay a loan
 * @route   POST /api/loans/:id/repay
 * @access  Private
 */
const repayLoan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, paymentMethod } = req.body;
  const userId = req.user.id;

  const loan = await Loan.findById(id);
  if (!loan) {
    return res.status(404).json({
      error: 'Loan not found',
      message: 'The requested loan does not exist'
    });
  }

  if (loan.borrowerId !== userId) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'Only the borrower can repay this loan'
    });
  }

  if (loan.status !== 'active') {
    return res.status(400).json({
      error: 'Invalid loan status',
      message: 'Loan is not active and cannot be repaid'
    });
  }

  // Repay loan on blockchain
  try {
    await loanService.repayLoanOnBlockchain(loan.id, userId, amount);
  } catch (error) {
    logger.error('Failed to repay loan on blockchain:', error);
    return res.status(500).json({
      error: 'Blockchain transaction failed',
      message: 'Unable to process repayment transaction'
    });
  }

  // Update loan in database
  await loan.repayLoan(amount);

  logger.info(`Loan repaid: ${loan.id} by user ${userId} with amount ${amount}`);
  
  res.json(formatSuccessResponse(
    loan.getPublicData(),
    'Loan repaid successfully'
  ));
});

/**
 * @desc    Update loan
 * @route   PUT /api/loans/:id
 * @access  Private
 */
const updateLoan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const loan = await Loan.findById(id);
  if (!loan) {
    return res.status(404).json({
      error: 'Loan not found',
      message: 'The requested loan does not exist'
    });
  }

  if (loan.borrowerId !== userId) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'Only the borrower can update this loan'
    });
  }

  if (loan.status !== 'pending') {
    return res.status(400).json({
      error: 'Cannot update loan',
      message: 'Only pending loans can be updated'
    });
  }

  await loan.update(req.body);

  res.json(formatSuccessResponse(
    loan.getPublicData(),
    'Loan updated successfully'
  ));
});

/**
 * @desc    Cancel loan
 * @route   DELETE /api/loans/:id
 * @access  Private
 */
const cancelLoan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const loan = await Loan.findById(id);
  if (!loan) {
    return res.status(404).json({
      error: 'Loan not found',
      message: 'The requested loan does not exist'
    });
  }

  if (loan.borrowerId !== userId) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'Only the borrower can cancel this loan'
    });
  }

  if (loan.status !== 'pending') {
    return res.status(400).json({
      error: 'Cannot cancel loan',
      message: 'Only pending loans can be cancelled'
    });
  }

  await loan.update({ status: 'cancelled', isActive: false });

  res.json(formatSuccessResponse(
    null,
    'Loan cancelled successfully'
  ));
});

/**
 * @desc    Add loan to favorites
 * @route   POST /api/loans/:id/favorite
 * @access  Private
 */
const addToFavorites = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const loan = await Loan.findById(id);
  if (!loan) {
    return res.status(404).json({
      error: 'Loan not found',
      message: 'The requested loan does not exist'
    });
  }

  await loan.addToFavorites(userId);

  res.json(formatSuccessResponse(
    null,
    'Loan added to favorites'
  ));
});

/**
 * @desc    Remove loan from favorites
 * @route   DELETE /api/loans/:id/favorite
 * @access  Private
 */
const removeFromFavorites = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const loan = await Loan.findById(id);
  if (!loan) {
    return res.status(404).json({
      error: 'Loan not found',
      message: 'The requested loan does not exist'
    });
  }

  await loan.removeFromFavorites(userId);

  res.json(formatSuccessResponse(
    null,
    'Loan removed from favorites'
  ));
});

/**
 * @desc    Get loans by user
 * @route   GET /api/loans/user/:userId
 * @access  Public
 */
const getLoansByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page, limit } = req.query;

  const loans = await Loan.findByBorrower(userId, {
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });

  res.json(formatSuccessResponse({
    loans: loans.map(loan => loan.getPublicData()),
    total: loans.length
  }));
});

/**
 * @desc    Get loans by category
 * @route   GET /api/loans/category/:category
 * @access  Public
 */
const getLoansByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { page, limit } = req.query;

  const loans = await Loan.findActive({
    category,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });

  res.json(formatSuccessResponse({
    loans: loans.map(loan => loan.getPublicData()),
    total: loans.length
  }));
});

/**
 * @desc    Get trending loans
 * @route   GET /api/loans/trending
 * @access  Public
 */
const getTrendingLoans = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  // Get loans sorted by views and recent activity
  const loans = await Loan.findActive({
    limit: parseInt(limit) || 10,
    sortBy: 'views',
    sortOrder: 'desc'
  });

  res.json(formatSuccessResponse({
    loans: loans.map(loan => loan.getPublicData())
  }));
});

/**
 * @desc    Get featured loans
 * @route   GET /api/loans/featured
 * @access  Public
 */
const getFeaturedLoans = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  // Get loans with high reputation scores
  const loans = await Loan.findActive({
    limit: parseInt(limit) || 10,
    minReputationScore: 500
  });

  res.json(formatSuccessResponse({
    loans: loans.map(loan => loan.getPublicData())
  }));
});

/**
 * @desc    Increment loan views
 * @route   POST /api/loans/:id/view
 * @access  Public
 */
const incrementViews = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const loan = await Loan.findById(id);
  if (!loan) {
    return res.status(404).json({
      error: 'Loan not found',
      message: 'The requested loan does not exist'
    });
  }

  await loan.incrementViews();

  res.json(formatSuccessResponse(
    { views: loan.views },
    'View count updated'
  ));
});

/**
 * @desc    Get loan lenders
 * @route   GET /api/loans/:id/lenders
 * @access  Public
 */
const getLoanLenders = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const loan = await Loan.findById(id);
  if (!loan) {
    return res.status(404).json({
      error: 'Loan not found',
      message: 'The requested loan does not exist'
    });
  }

  // Get lender details
  const lenders = await Promise.all(
    loan.lenders.map(async (lenderId) => {
      const user = await User.findById(lenderId);
      return {
        id: lenderId,
        contribution: loan.lenderContributions[lenderId],
        profile: user ? user.getPublicProfile() : null
      };
    })
  );

  res.json(formatSuccessResponse({ lenders }));
});

/**
 * @desc    Get loan repayments
 * @route   GET /api/loans/:id/repayments
 * @access  Private
 */
const getLoanRepayments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const loan = await Loan.findById(id);
  if (!loan) {
    return res.status(404).json({
      error: 'Loan not found',
      message: 'The requested loan does not exist'
    });
  }

  // Check if user is borrower or lender
  const isBorrower = loan.borrowerId === userId;
  const isLender = loan.lenders.includes(userId);

  if (!isBorrower && !isLender) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'Only borrowers and lenders can view repayment history'
    });
  }

  res.json(formatSuccessResponse({
    repayments: loan.repayments
  }));
});

/**
 * @desc    Add comment to loan
 * @route   POST /api/loans/:id/comment
 * @access  Private
 */
const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const userId = req.user.id;

  const loan = await Loan.findById(id);
  if (!loan) {
    return res.status(404).json({
      error: 'Loan not found',
      message: 'The requested loan does not exist'
    });
  }

  const newComment = {
    id: Date.now().toString(),
    userId,
    comment,
    createdAt: new Date()
  };

  loan.comments.push(newComment);
  await loan.update({ comments: loan.comments });

  res.json(formatSuccessResponse(
    newComment,
    'Comment added successfully'
  ));
});

/**
 * @desc    Get loan comments
 * @route   GET /api/loans/:id/comments
 * @access  Public
 */
const getComments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const loan = await Loan.findById(id);
  if (!loan) {
    return res.status(404).json({
      error: 'Loan not found',
      message: 'The requested loan does not exist'
    });
  }

  // Get commenter details
  const commentsWithUsers = await Promise.all(
    loan.comments.map(async (comment) => {
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
 * @desc    Report a loan
 * @route   POST /api/loans/:id/report
 * @access  Private
 */
const reportLoan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, description } = req.body;
  const userId = req.user.id;

  const loan = await Loan.findById(id);
  if (!loan) {
    return res.status(404).json({
      error: 'Loan not found',
      message: 'The requested loan does not exist'
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

  // Add report to loan (in a real app, you'd store this separately)
  loan.reports = loan.reports || [];
  loan.reports.push(report);
  await loan.update({ reports: loan.reports });

  res.json(formatSuccessResponse(
    null,
    'Loan reported successfully'
  ));
});

/**
 * @desc    Get loan statistics
 * @route   GET /api/loans/stats/overview
 * @access  Public
 */
const getLoanStats = asyncHandler(async (req, res) => {
  const stats = await loanService.getLoanStatistics();

  res.json(formatSuccessResponse(stats));
});

module.exports = {
  createLoan,
  getAllLoans,
  searchLoans,
  getLoanById,
  fundLoan,
  repayLoan,
  updateLoan,
  cancelLoan,
  addToFavorites,
  removeFromFavorites,
  getLoansByUser,
  getLoansByCategory,
  getTrendingLoans,
  getFeaturedLoans,
  incrementViews,
  getLoanLenders,
  getLoanRepayments,
  addComment,
  getComments,
  reportLoan,
  getLoanStats
};
