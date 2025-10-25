// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/ILoanManager.sol";

/**
 * @title AfriLendLoanManager
 * @dev Core loan management contract for AfriLend platform
 * @notice Handles loan creation, funding, repayment, and default management
 */
contract AfriLendLoanManager is ILoanManager {
    // State variables
    uint256 private _loanCounter;
    mapping(uint256 => Loan) private _loans;
    mapping(address => uint256[]) private _borrowerLoans;
    mapping(address => uint256[]) private _lenderLoans;
    
    // Constants
    uint256 public constant MIN_LOAN_AMOUNT = 0.01 ether;
    uint256 public constant MAX_LOAN_AMOUNT = 100 ether;
    uint256 public constant MIN_INTEREST_RATE = 5; // 5%
    uint256 public constant MAX_INTEREST_RATE = 50; // 50%
    uint256 public constant MIN_DURATION = 30 days;
    uint256 public constant MAX_DURATION = 365 days;
    
    // Modifiers
    modifier onlyValidLoan(uint256 loanId) {
        require(loanId < _loanCounter, "Loan does not exist");
        _;
    }
    
    modifier onlyBorrower(uint256 loanId) {
        require(_loans[loanId].borrower == msg.sender, "Only borrower can perform this action");
        _;
    }
    
    modifier onlyActiveLoan(uint256 loanId) {
        require(_loans[loanId].status == LoanStatus.Active, "Loan is not active");
        _;
    }

    /**
     * @dev Creates a new loan request
     * @param amount The loan amount in wei
     * @param interestRate The annual interest rate (in basis points, e.g., 1000 = 10%)
     * @param duration The loan duration in seconds
     * @param purpose Description of loan purpose
     * @return loanId The ID of the created loan
     */
    function createLoan(
        uint256 amount,
        uint256 interestRate,
        uint256 duration,
        string calldata purpose
    ) external override returns (uint256) {
        require(amount >= MIN_LOAN_AMOUNT && amount <= MAX_LOAN_AMOUNT, "Invalid loan amount");
        require(interestRate >= MIN_INTEREST_RATE && interestRate <= MAX_INTEREST_RATE, "Invalid interest rate");
        require(duration >= MIN_DURATION && duration <= MAX_DURATION, "Invalid duration");
        require(bytes(purpose).length > 0, "Purpose cannot be empty");
        
        uint256 loanId = _loanCounter++;
        Loan storage loan = _loans[loanId];
        
        loan.id = loanId;
        loan.borrower = msg.sender;
        loan.amount = amount;
        loan.fundedAmount = 0;
        loan.interestRate = interestRate;
        loan.duration = duration;
        loan.createdAt = block.timestamp;
        loan.dueDate = block.timestamp + duration;
        loan.purpose = purpose;
        loan.status = LoanStatus.Pending;
        
        _borrowerLoans[msg.sender].push(loanId);
        
        emit LoanCreated(loanId, msg.sender, amount, interestRate, duration, purpose);
        
        return loanId;
    }

    /**
     * @dev Allows lenders to fund a loan
     * @param loanId The ID of the loan to fund
     */
    function fundLoan(uint256 loanId) external payable override onlyValidLoan(loanId) {
        Loan storage loan = _loans[loanId];
        require(loan.status == LoanStatus.Pending, "Loan is not available for funding");
        require(msg.value > 0, "Funding amount must be greater than 0");
        require(msg.value <= (loan.amount - loan.fundedAmount), "Funding amount exceeds remaining loan amount");
        
        loan.fundedAmount += msg.value;
        loan.lenderContributions[msg.sender] += msg.value;
        
        // Add lender to lenders array if not already present
        bool lenderExists = false;
        for (uint i = 0; i < loan.lenders.length; i++) {
            if (loan.lenders[i] == msg.sender) {
                lenderExists = true;
                break;
            }
        }
        if (!lenderExists) {
            loan.lenders.push(msg.sender);
            _lenderLoans[msg.sender].push(loanId);
        }
        
        // Check if loan is fully funded
        if (loan.fundedAmount >= loan.amount) {
            loan.status = LoanStatus.Active;
        }
        
        emit LoanFunded(loanId, msg.sender, msg.value);
    }

    /**
     * @dev Allows borrower to repay the loan
     * @param loanId The ID of the loan to repay
     */
    function repayLoan(uint256 loanId) external payable override onlyValidLoan(loanId) onlyBorrower(loanId) onlyActiveLoan(loanId) {
        Loan storage loan = _loans[loanId];
        uint256 repaymentAmount = calculateRepaymentAmount(loanId);
        
        require(msg.value >= repaymentAmount, "Insufficient repayment amount");
        require(block.timestamp <= loan.dueDate, "Loan has expired");
        
        // Distribute repayment to lenders proportionally
        for (uint i = 0; i < loan.lenders.length; i++) {
            address lender = loan.lenders[i];
            uint256 contribution = loan.lenderContributions[lender];
            uint256 lenderShare = (contribution * repaymentAmount) / loan.fundedAmount;
            
            payable(lender).transfer(lenderShare);
        }
        
        // Return excess payment to borrower
        if (msg.value > repaymentAmount) {
            payable(msg.sender).transfer(msg.value - repaymentAmount);
        }
        
        loan.status = LoanStatus.Repaid;
        
        emit LoanRepaid(loanId, msg.sender, repaymentAmount);
    }

    /**
     * @dev Gets loan details
     * @param loanId The ID of the loan
     * @return id The loan ID
     * @return borrower The borrower's address
     * @return amount The loan amount
     * @return fundedAmount The amount funded so far
     * @return interestRate The interest rate
     * @return duration The loan duration
     * @return createdAt The creation timestamp
     * @return dueDate The due date timestamp
     * @return purpose The loan purpose
     * @return status The loan status
     */
    function getLoan(uint256 loanId) external view override onlyValidLoan(loanId) returns (
        uint256 id,
        address borrower,
        uint256 amount,
        uint256 fundedAmount,
        uint256 interestRate,
        uint256 duration,
        uint256 createdAt,
        uint256 dueDate,
        string memory purpose,
        LoanStatus status
    ) {
        Loan storage loan = _loans[loanId];
        return (
            loan.id,
            loan.borrower,
            loan.amount,
            loan.fundedAmount,
            loan.interestRate,
            loan.duration,
            loan.createdAt,
            loan.dueDate,
            loan.purpose,
            loan.status
        );
    }

    /**
     * @dev Gets all lenders for a loan
     * @param loanId The ID of the loan
     * @return Array of lender addresses
     */
    function getLoanLenders(uint256 loanId) external view override onlyValidLoan(loanId) returns (address[] memory) {
        return _loans[loanId].lenders;
    }

    /**
     * @dev Gets a lender's contribution to a loan
     * @param loanId The ID of the loan
     * @param lender The lender's address
     * @return The contribution amount
     */
    function getLenderContribution(uint256 loanId, address lender) external view override onlyValidLoan(loanId) returns (uint256) {
        return _loans[loanId].lenderContributions[lender];
    }

    /**
     * @dev Checks if a loan is fully funded
     * @param loanId The ID of the loan
     * @return True if fully funded
     */
    function isLoanFullyFunded(uint256 loanId) external view override onlyValidLoan(loanId) returns (bool) {
        return _loans[loanId].fundedAmount >= _loans[loanId].amount;
    }

    /**
     * @dev Calculates the total repayment amount including interest
     * @param loanId The ID of the loan
     * @return The total repayment amount
     */
    function calculateRepaymentAmount(uint256 loanId) public view override onlyValidLoan(loanId) returns (uint256) {
        Loan storage loan = _loans[loanId];
        uint256 principal = loan.fundedAmount;
        uint256 interest = (principal * loan.interestRate * loan.duration) / (365 days * 10000);
        return principal + interest;
    }

    /**
     * @dev Gets all loans for a borrower
     * @param borrower The borrower's address
     * @return Array of loan IDs
     */
    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return _borrowerLoans[borrower];
    }

    /**
     * @dev Gets all loans for a lender
     * @param lender The lender's address
     * @return Array of loan IDs
     */
    function getLenderLoans(address lender) external view returns (uint256[] memory) {
        return _lenderLoans[lender];
    }

    /**
     * @dev Gets the total number of loans created
     * @return The total number of loans
     */
    function getTotalLoans() external view returns (uint256) {
        return _loanCounter;
    }
}
