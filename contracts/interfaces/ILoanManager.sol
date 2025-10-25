// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ILoanManager
 * @dev Interface for the AfriLend Loan Manager contract
 * @notice Defines the core functionality for managing loans in the AfriLend platform
 */
interface ILoanManager {
    // Events
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount,
        uint256 interestRate,
        uint256 duration,
        string purpose
    );
    
    event LoanFunded(
        uint256 indexed loanId,
        address indexed lender,
        uint256 amount
    );
    
    event LoanRepaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount
    );
    
    event LoanDefaulted(
        uint256 indexed loanId,
        address indexed borrower
    );

    // Structs
    struct Loan {
        uint256 id;
        address borrower;
        uint256 amount;
        uint256 fundedAmount;
        uint256 interestRate;
        uint256 duration;
        uint256 createdAt;
        uint256 dueDate;
        string purpose;
        LoanStatus status;
        address[] lenders;
        mapping(address => uint256) lenderContributions;
    }

    enum LoanStatus {
        Pending,
        Funded,
        Active,
        Repaid,
        Defaulted
    }

    // Functions
    function createLoan(
        uint256 amount,
        uint256 interestRate,
        uint256 duration,
        string calldata purpose
    ) external returns (uint256);

    function fundLoan(uint256 loanId) external payable;

    function repayLoan(uint256 loanId) external payable;

    function getLoan(uint256 loanId) external view returns (
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
    );

    function getLoanLenders(uint256 loanId) external view returns (address[] memory);

    function getLenderContribution(uint256 loanId, address lender) external view returns (uint256);

    function isLoanFullyFunded(uint256 loanId) external view returns (bool);

    function calculateRepaymentAmount(uint256 loanId) external view returns (uint256);
}
