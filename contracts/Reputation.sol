// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Reputation
 * @dev Reputation and trust scoring system for AfriLend platform
 * @notice Manages user reputation scores based on loan history and behavior
 */
contract Reputation {
    // Events
    event ReputationUpdated(
        address indexed user,
        uint256 newScore,
        uint256 previousScore,
        string reason
    );
    
    event TrustLevelChanged(
        address indexed user,
        TrustLevel newLevel,
        TrustLevel previousLevel
    );

    // Structs
    struct UserReputation {
        uint256 score;
        uint256 totalLoans;
        uint256 successfulLoans;
        uint256 defaultedLoans;
        uint256 totalLent;
        uint256 totalBorrowed;
        uint256 lastUpdated;
        TrustLevel trustLevel;
        mapping(string => uint256) categoryScores;
    }

    enum TrustLevel {
        New,        // 0-100 points
        Basic,      // 101-300 points
        Good,       // 301-600 points
        Excellent,  // 601-1000 points
        Premium     // 1000+ points
    }

    // State variables
    mapping(address => UserReputation) private _reputations;
    mapping(address => bool) private _registeredUsers;
    address[] private _users;
    
    // Constants
    uint256 public constant MAX_SCORE = 2000;
    uint256 public constant MIN_SCORE = 0;
    
    // Reputation point values
    uint256 public constant SUCCESSFUL_LOAN_POINTS = 50;
    uint256 public constant DEFAULT_PENALTY = 100;
    uint256 public constant ON_TIME_REPAYMENT_BONUS = 25;
    uint256 public constant EARLY_REPAYMENT_BONUS = 10;
    uint256 public constant LENDING_POINTS = 30;
    uint256 public constant REFERRAL_POINTS = 20;
    
    // Modifiers
    modifier onlyRegisteredUser(address user) {
        require(_registeredUsers[user], "User not registered");
        _;
    }

    /**
     * @dev Registers a new user in the reputation system
     * @param user The user's address
     */
    function registerUser(address user) external {
        require(!_registeredUsers[user], "User already registered");
        
        _registeredUsers[user] = true;
        _users.push(user);
        
        UserReputation storage reputation = _reputations[user];
        reputation.score = 100; // Starting score for new users
        reputation.trustLevel = TrustLevel.New;
        reputation.lastUpdated = block.timestamp;
        
        emit ReputationUpdated(user, 100, 0, "User registered");
    }

    /**
     * @dev Updates reputation after a successful loan repayment
     * @param borrower The borrower's address
     * @param loanAmount The loan amount
     * @param wasOnTime Whether the repayment was on time
     * @param wasEarly Whether the repayment was early
     */
    function updateReputationOnRepayment(
        address borrower,
        uint256 loanAmount,
        bool wasOnTime,
        bool wasEarly
    ) external onlyRegisteredUser(borrower) {
        UserReputation storage reputation = _reputations[borrower];
        uint256 previousScore = reputation.score;
        
        reputation.successfulLoans++;
        reputation.totalLoans++;
        reputation.totalBorrowed += loanAmount;
        
        uint256 pointsToAdd = SUCCESSFUL_LOAN_POINTS;
        
        if (wasOnTime) {
            pointsToAdd += ON_TIME_REPAYMENT_BONUS;
        }
        
        if (wasEarly) {
            pointsToAdd += EARLY_REPAYMENT_BONUS;
        }
        
        reputation.score = _min(reputation.score + pointsToAdd, MAX_SCORE);
        reputation.lastUpdated = block.timestamp;
        
        _updateTrustLevel(borrower, previousScore, reputation.score);
        
        emit ReputationUpdated(borrower, reputation.score, previousScore, "Successful loan repayment");
    }

    /**
     * @dev Updates reputation after a loan default
     * @param borrower The borrower's address
     * @param loanAmount The defaulted loan amount
     */
    function updateReputationOnDefault(
        address borrower,
        uint256 loanAmount
    ) external onlyRegisteredUser(borrower) {
        UserReputation storage reputation = _reputations[borrower];
        uint256 previousScore = reputation.score;
        
        reputation.defaultedLoans++;
        reputation.totalLoans++;
        reputation.totalBorrowed += loanAmount;
        
        uint256 penalty = DEFAULT_PENALTY;
        reputation.score = _max(reputation.score - penalty, MIN_SCORE);
        reputation.lastUpdated = block.timestamp;
        
        _updateTrustLevel(borrower, previousScore, reputation.score);
        
        emit ReputationUpdated(borrower, reputation.score, previousScore, "Loan default");
    }

    /**
     * @dev Updates reputation for lending activity
     * @param lender The lender's address
     * @param loanAmount The amount lent
     */
    function updateReputationOnLending(
        address lender,
        uint256 loanAmount
    ) external onlyRegisteredUser(lender) {
        UserReputation storage reputation = _reputations[lender];
        uint256 previousScore = reputation.score;
        
        reputation.totalLent += loanAmount;
        
        uint256 pointsToAdd = LENDING_POINTS;
        reputation.score = _min(reputation.score + pointsToAdd, MAX_SCORE);
        reputation.lastUpdated = block.timestamp;
        
        _updateTrustLevel(lender, previousScore, reputation.score);
        
        emit ReputationUpdated(lender, reputation.score, previousScore, "Lending activity");
    }

    /**
     * @dev Updates reputation for referral activity
     * @param referrer The referrer's address
     * @param referredUser The referred user's address
     */
    function updateReputationOnReferral(
        address referrer,
        address referredUser
    ) external onlyRegisteredUser(referrer) {
        UserReputation storage reputation = _reputations[referrer];
        uint256 previousScore = reputation.score;
        
        uint256 pointsToAdd = REFERRAL_POINTS;
        reputation.score = _min(reputation.score + pointsToAdd, MAX_SCORE);
        reputation.lastUpdated = block.timestamp;
        
        _updateTrustLevel(referrer, previousScore, reputation.score);
        
        emit ReputationUpdated(referrer, reputation.score, previousScore, "Referral bonus");
    }

    /**
     * @dev Updates category-specific reputation score
     * @param user The user's address
     * @param category The category name
     * @param points The points to add/subtract
     */
    function updateCategoryScore(
        address user,
        string calldata category,
        int256 points
    ) external onlyRegisteredUser(user) {
        UserReputation storage reputation = _reputations[user];
        uint256 previousScore = reputation.score;
        
        if (points > 0) {
            reputation.categoryScores[category] += uint256(points);
            reputation.score = _min(reputation.score + uint256(points), MAX_SCORE);
        } else {
            uint256 absPoints = uint256(-points);
            reputation.categoryScores[category] = _max(reputation.categoryScores[category] - absPoints, 0);
            reputation.score = _max(reputation.score - absPoints, MIN_SCORE);
        }
        
        reputation.lastUpdated = block.timestamp;
        
        _updateTrustLevel(user, previousScore, reputation.score);
        
        emit ReputationUpdated(user, reputation.score, previousScore, string(abi.encodePacked("Category update: ", category)));
    }

    /**
     * @dev Gets user reputation details
     * @param user The user's address
     * @return score The user's reputation score
     * @return trustLevel The user's trust level
     * @return totalLoans Total number of loans
     * @return successfulLoans Number of successful loans
     * @return defaultedLoans Number of defaulted loans
     * @return totalLent Total amount lent
     * @return totalBorrowed Total amount borrowed
     * @return lastUpdated Last update timestamp
     */
    function getUserReputation(address user) external view onlyRegisteredUser(user) returns (
        uint256 score,
        TrustLevel trustLevel,
        uint256 totalLoans,
        uint256 successfulLoans,
        uint256 defaultedLoans,
        uint256 totalLent,
        uint256 totalBorrowed,
        uint256 lastUpdated
    ) {
        UserReputation storage reputation = _reputations[user];
        return (
            reputation.score,
            reputation.trustLevel,
            reputation.totalLoans,
            reputation.successfulLoans,
            reputation.defaultedLoans,
            reputation.totalLent,
            reputation.totalBorrowed,
            reputation.lastUpdated
        );
    }

    /**
     * @dev Gets category-specific score for a user
     * @param user The user's address
     * @param category The category name
     * @return The category score
     */
    function getCategoryScore(address user, string calldata category) external view onlyRegisteredUser(user) returns (uint256) {
        return _reputations[user].categoryScores[category];
    }

    /**
     * @dev Checks if a user is registered
     * @param user The user's address
     * @return True if registered
     */
    function isUserRegistered(address user) external view returns (bool) {
        return _registeredUsers[user];
    }

    /**
     * @dev Gets the total number of registered users
     * @return The total number of users
     */
    function getTotalUsers() external view returns (uint256) {
        return _users.length;
    }

    /**
     * @dev Gets all registered users
     * @return Array of user addresses
     */
    function getAllUsers() external view returns (address[] memory) {
        return _users;
    }

    /**
     * @dev Internal function to update trust level based on score
     * @param user The user's address
     * @param previousScore The previous score
     * @param newScore The new score
     */
    function _updateTrustLevel(address user, uint256 previousScore, uint256 newScore) internal {
        TrustLevel previousLevel = _reputations[user].trustLevel;
        TrustLevel newLevel;
        
        if (newScore >= 1000) {
            newLevel = TrustLevel.Premium;
        } else if (newScore >= 601) {
            newLevel = TrustLevel.Excellent;
        } else if (newScore >= 301) {
            newLevel = TrustLevel.Good;
        } else if (newScore >= 101) {
            newLevel = TrustLevel.Basic;
        } else {
            newLevel = TrustLevel.New;
        }
        
        if (newLevel != previousLevel) {
            _reputations[user].trustLevel = newLevel;
            emit TrustLevelChanged(user, newLevel, previousLevel);
        }
    }

    /**
     * @dev Internal function to get minimum of two values
     * @param a First value
     * @param b Second value
     * @return The minimum value
     */
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /**
     * @dev Internal function to get maximum of two values
     * @param a First value
     * @param b Second value
     * @return The maximum value
     */
    function _max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
}
