// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title LenderPool
 * @dev Manages lending pools for the AfriLend platform
 * @notice Handles pool creation, liquidity management, and yield distribution
 */
contract LenderPool {
    // Events
    event PoolCreated(
        uint256 indexed poolId,
        address indexed creator,
        string name,
        uint256 targetAmount,
        uint256 interestRate
    );
    
    event LiquidityAdded(
        uint256 indexed poolId,
        address indexed lender,
        uint256 amount
    );
    
    event LiquidityRemoved(
        uint256 indexed poolId,
        address indexed lender,
        uint256 amount
    );
    
    event YieldDistributed(
        uint256 indexed poolId,
        uint256 totalYield,
        uint256 timestamp
    );

    // Structs
    struct Pool {
        uint256 id;
        address creator;
        string name;
        string description;
        uint256 targetAmount;
        uint256 currentAmount;
        uint256 interestRate;
        uint256 createdAt;
        bool active;
        address[] lenders;
        mapping(address => uint256) lenderShares;
        mapping(address => uint256) lenderYield;
    }

    // State variables
    uint256 private _poolCounter;
    mapping(uint256 => Pool) private _pools;
    mapping(address => uint256[]) private _userPools;
    
    // Constants
    uint256 public constant MIN_POOL_AMOUNT = 1 ether;
    uint256 public constant MAX_POOL_AMOUNT = 1000 ether;
    uint256 public constant MIN_INTEREST_RATE = 3; // 3%
    uint256 public constant MAX_INTEREST_RATE = 25; // 25%
    
    // Modifiers
    modifier onlyValidPool(uint256 poolId) {
        require(poolId < _poolCounter, "Pool does not exist");
        _;
    }
    
    modifier onlyPoolCreator(uint256 poolId) {
        require(_pools[poolId].creator == msg.sender, "Only pool creator can perform this action");
        _;
    }
    
    modifier onlyActivePool(uint256 poolId) {
        require(_pools[poolId].active, "Pool is not active");
        _;
    }

    /**
     * @dev Creates a new lending pool
     * @param name The name of the pool
     * @param description Description of the pool
     * @param targetAmount The target amount for the pool
     * @param interestRate The interest rate for the pool
     * @return poolId The ID of the created pool
     */
    function createPool(
        string calldata name,
        string calldata description,
        uint256 targetAmount,
        uint256 interestRate
    ) external returns (uint256) {
        require(bytes(name).length > 0, "Pool name cannot be empty");
        require(targetAmount >= MIN_POOL_AMOUNT && targetAmount <= MAX_POOL_AMOUNT, "Invalid target amount");
        require(interestRate >= MIN_INTEREST_RATE && interestRate <= MAX_INTEREST_RATE, "Invalid interest rate");
        
        uint256 poolId = _poolCounter++;
        Pool storage pool = _pools[poolId];
        
        pool.id = poolId;
        pool.creator = msg.sender;
        pool.name = name;
        pool.description = description;
        pool.targetAmount = targetAmount;
        pool.currentAmount = 0;
        pool.interestRate = interestRate;
        pool.createdAt = block.timestamp;
        pool.active = true;
        
        _userPools[msg.sender].push(poolId);
        
        emit PoolCreated(poolId, msg.sender, name, targetAmount, interestRate);
        
        return poolId;
    }

    /**
     * @dev Adds liquidity to a pool
     * @param poolId The ID of the pool
     */
    function addLiquidity(uint256 poolId) external payable onlyValidPool(poolId) onlyActivePool(poolId) {
        Pool storage pool = _pools[poolId];
        require(msg.value > 0, "Amount must be greater than 0");
        require(pool.currentAmount + msg.value <= pool.targetAmount, "Exceeds pool target amount");
        
        pool.currentAmount += msg.value;
        pool.lenderShares[msg.sender] += msg.value;
        
        // Add lender to lenders array if not already present
        bool lenderExists = false;
        for (uint i = 0; i < pool.lenders.length; i++) {
            if (pool.lenders[i] == msg.sender) {
                lenderExists = true;
                break;
            }
        }
        if (!lenderExists) {
            pool.lenders.push(msg.sender);
            _userPools[msg.sender].push(poolId);
        }
        
        emit LiquidityAdded(poolId, msg.sender, msg.value);
    }

    /**
     * @dev Removes liquidity from a pool
     * @param poolId The ID of the pool
     * @param amount The amount to remove
     */
    function removeLiquidity(uint256 poolId, uint256 amount) external onlyValidPool(poolId) {
        Pool storage pool = _pools[poolId];
        require(pool.lenderShares[msg.sender] >= amount, "Insufficient shares");
        
        pool.currentAmount -= amount;
        pool.lenderShares[msg.sender] -= amount;
        
        payable(msg.sender).transfer(amount);
        
        emit LiquidityRemoved(poolId, msg.sender, amount);
    }

    /**
     * @dev Distributes yield to pool participants
     * @param poolId The ID of the pool
     * @param totalYield The total yield to distribute
     */
    function distributeYield(uint256 poolId, uint256 totalYield) external onlyValidPool(poolId) onlyPoolCreator(poolId) {
        Pool storage pool = _pools[poolId];
        require(totalYield > 0, "Yield must be greater than 0");
        require(pool.currentAmount > 0, "Pool has no liquidity");
        
        // Distribute yield proportionally based on shares
        for (uint i = 0; i < pool.lenders.length; i++) {
            address lender = pool.lenders[i];
            uint256 lenderShare = pool.lenderShares[lender];
            uint256 lenderYield = (totalYield * lenderShare) / pool.currentAmount;
            
            pool.lenderYield[lender] += lenderYield;
            payable(lender).transfer(lenderYield);
        }
        
        emit YieldDistributed(poolId, totalYield, block.timestamp);
    }

    /**
     * @dev Gets pool details
     * @param poolId The ID of the pool
     * @return id The pool ID
     * @return creator The pool creator's address
     * @return name The pool name
     * @return description The pool description
     * @return targetAmount The target amount for the pool
     * @return currentAmount The current amount in the pool
     * @return interestRate The pool interest rate
     * @return createdAt The creation timestamp
     * @return active Whether the pool is active
     */
    function getPool(uint256 poolId) external view onlyValidPool(poolId) returns (
        uint256 id,
        address creator,
        string memory name,
        string memory description,
        uint256 targetAmount,
        uint256 currentAmount,
        uint256 interestRate,
        uint256 createdAt,
        bool active
    ) {
        Pool storage pool = _pools[poolId];
        return (
            pool.id,
            pool.creator,
            pool.name,
            pool.description,
            pool.targetAmount,
            pool.currentAmount,
            pool.interestRate,
            pool.createdAt,
            pool.active
        );
    }

    /**
     * @dev Gets all lenders in a pool
     * @param poolId The ID of the pool
     * @return Array of lender addresses
     */
    function getPoolLenders(uint256 poolId) external view onlyValidPool(poolId) returns (address[] memory) {
        return _pools[poolId].lenders;
    }

    /**
     * @dev Gets a lender's share in a pool
     * @param poolId The ID of the pool
     * @param lender The lender's address
     * @return The lender's share
     */
    function getLenderShare(uint256 poolId, address lender) external view onlyValidPool(poolId) returns (uint256) {
        return _pools[poolId].lenderShares[lender];
    }

    /**
     * @dev Gets a lender's total yield from a pool
     * @param poolId The ID of the pool
     * @param lender The lender's address
     * @return The lender's total yield
     */
    function getLenderYield(uint256 poolId, address lender) external view onlyValidPool(poolId) returns (uint256) {
        return _pools[poolId].lenderYield[lender];
    }

    /**
     * @dev Gets all pools for a user
     * @param user The user's address
     * @return Array of pool IDs
     */
    function getUserPools(address user) external view returns (uint256[] memory) {
        return _userPools[user];
    }

    /**
     * @dev Gets the total number of pools created
     * @return The total number of pools
     */
    function getTotalPools() external view returns (uint256) {
        return _poolCounter;
    }

    /**
     * @dev Deactivates a pool (only creator can do this)
     * @param poolId The ID of the pool
     */
    function deactivatePool(uint256 poolId) external onlyValidPool(poolId) onlyPoolCreator(poolId) {
        _pools[poolId].active = false;
    }
}
