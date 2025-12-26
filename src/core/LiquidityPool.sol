// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title LiquidityPool
 * @notice Manages investor deposits across risk-tiered pools for invoice factoring
 * @dev Investors deposit USDT, receive LP shares, and earn yield when invoices are paid
 */
contract LiquidityPool is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================
    // Enums
    // ============================================

    enum RiskTier {
        TIER_A, // Low risk: 8-12% APY
        TIER_B, // Medium: 15-20% APY
        TIER_C // Higher: 22-30% APY
    }

    enum DeploymentStatus {
        ACTIVE,
        RETURNED_FULL,
        RETURNED_PARTIAL,
        DEFAULTED
    }

    // ============================================
    // Structs
    // ============================================

    struct Pool {
        RiskTier tier;
        uint256 totalDeposits; // Total USDT in pool
        uint256 totalShares; // Total LP shares
        uint256 availableLiquidity; // Not deployed to invoices
        uint256 deployedLiquidity; // Currently funding invoices
        uint256 pendingReturns; // Expected returns from active invoices
        uint256 totalYieldEarned; // Cumulative yield earned
        uint256 totalLosses; // Cumulative losses from defaults
        uint256 targetAPY; // Target annual yield (basis points)
        uint256 minDeposit;
        uint256 maxDeposit; // Per transaction
        uint256 maxPoolSize; // Total pool cap
        bool acceptingDeposits;
        uint256 lastYieldDistribution;
    }

    struct UserPosition {
        uint256 shares;
        uint256 depositedValue; // Original deposit amount
        uint256 lastDepositAt;
        uint256 pendingYield;
        uint256 totalYieldClaimed;
    }

    struct Deployment {
        uint256 deploymentId;
        uint256 invoiceId;
        RiskTier tier;
        uint256 principalAmount; // USDT deployed
        uint256 expectedReturn; // Principal + expected yield
        uint256 actualReturn; // What was actually returned
        uint256 deployedAt;
        uint256 expectedReturnDate; // Invoice due date
        uint256 returnedAt;
        DeploymentStatus status;
    }

    // ============================================
    // State Variables
    // ============================================

    bytes32 public constant DEPLOYER_ROLE = keccak256("DEPLOYER_ROLE");
    bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");

    IERC20 public immutable stablecoin;

    // RiskTier => Pool
    mapping(RiskTier => Pool) private _pools;

    // User => RiskTier => Position
    mapping(address => mapping(RiskTier => UserPosition)) private _userPositions;

    // deploymentId => Deployment
    mapping(uint256 => Deployment) private _deployments;

    // RiskTier => deploymentId[]
    mapping(RiskTier => uint256[]) private _activeDeploymentsByTier;

    // invoiceId => deploymentId[]
    mapping(uint256 => uint256[]) private _deploymentsByInvoice;

    uint256 private _nextDeploymentId = 1;

    uint256 public protocolFeeBps = 500; // 5% of yield
    uint256 public accumulatedProtocolFees;

    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant PRECISION = 1e18;
    uint256 private constant SECONDS_PER_YEAR = 365 days;

    // ============================================
    // Events
    // ============================================

    event PoolInitialized(RiskTier indexed tier, uint256 targetAPY, uint256 maxPoolSize);
    event PoolConfigUpdated(RiskTier indexed tier);
    event DepositsEnabled(RiskTier indexed tier);
    event DepositsPaused(RiskTier indexed tier);
    event Deposited(address indexed user, RiskTier indexed tier, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, RiskTier indexed tier, uint256 shares, uint256 amount);
    event YieldClaimed(address indexed user, RiskTier indexed tier, uint256 amount);
    event YieldCompounded(
        address indexed user, RiskTier indexed tier, uint256 yieldAmount, uint256 newShares
    );
    event LiquidityDeployed(
        uint256 indexed deploymentId, RiskTier indexed tier, uint256 invoiceId, uint256 amount
    );
    event LiquidityReturned(uint256 indexed deploymentId, uint256 returnedAmount, uint256 yieldEarned);
    event DeploymentDefaulted(uint256 indexed deploymentId, uint256 lossAmount, uint256 recoveredAmount);
    event ProtocolFeeCollected(uint256 amount);

    // ============================================
    // Errors
    // ============================================

    error PoolNotInitialized();
    error PoolAlreadyInitialized();
    error PoolNotAcceptingDeposits();
    error InsufficientDeposit();
    error ExceedsMaxDeposit();
    error ExceedsPoolCapacity();
    error InsufficientShares();
    error InsufficientLiquidity();
    error DeploymentNotFound();
    error DeploymentNotActive();
    error InvalidAmount();
    error ZeroShares();
    error WithdrawalLocked();
    error NoPendingYield();

    // ============================================
    // Constructor
    // ============================================

    constructor(address _stablecoin, address _admin) {
        if (_stablecoin == address(0) || _admin == address(0)) revert InvalidAmount();

        stablecoin = IERC20(_stablecoin);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(POOL_MANAGER_ROLE, _admin);
    }

    // ============================================
    // Pool Configuration (Admin)
    // ============================================

    function initializePool(
        RiskTier tier,
        uint256 targetAPY,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 maxPoolSize
    ) external onlyRole(POOL_MANAGER_ROLE) {
        Pool storage pool = _pools[tier];
        if (pool.maxPoolSize != 0) revert PoolAlreadyInitialized();

        pool.tier = tier;
        pool.targetAPY = targetAPY;
        pool.minDeposit = minDeposit;
        pool.maxDeposit = maxDeposit;
        pool.maxPoolSize = maxPoolSize;
        pool.acceptingDeposits = true;
        pool.lastYieldDistribution = block.timestamp;

        emit PoolInitialized(tier, targetAPY, maxPoolSize);
    }

    function updatePoolConfig(
        RiskTier tier,
        uint256 targetAPY,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 maxPoolSize
    ) external onlyRole(POOL_MANAGER_ROLE) {
        Pool storage pool = _pools[tier];
        if (pool.maxPoolSize == 0) revert PoolNotInitialized();

        pool.targetAPY = targetAPY;
        pool.minDeposit = minDeposit;
        pool.maxDeposit = maxDeposit;
        pool.maxPoolSize = maxPoolSize;

        emit PoolConfigUpdated(tier);
    }

    function pauseDeposits(RiskTier tier) external onlyRole(POOL_MANAGER_ROLE) {
        Pool storage pool = _pools[tier];
        if (pool.maxPoolSize == 0) revert PoolNotInitialized();

        pool.acceptingDeposits = false;
        emit DepositsPaused(tier);
    }

    function resumeDeposits(RiskTier tier) external onlyRole(POOL_MANAGER_ROLE) {
        Pool storage pool = _pools[tier];
        if (pool.maxPoolSize == 0) revert PoolNotInitialized();

        pool.acceptingDeposits = true;
        emit DepositsEnabled(tier);
    }

    // ============================================
    // Investor Actions
    // ============================================

    function deposit(RiskTier tier, uint256 amount) external nonReentrant returns (uint256 shares) {
        Pool storage pool = _pools[tier];
        if (pool.maxPoolSize == 0) revert PoolNotInitialized();
        if (!pool.acceptingDeposits) revert PoolNotAcceptingDeposits();
        if (amount < pool.minDeposit) revert InsufficientDeposit();
        if (amount > pool.maxDeposit) revert ExceedsMaxDeposit();
        if (pool.totalDeposits + amount > pool.maxPoolSize) revert ExceedsPoolCapacity();

        // Calculate shares based on exchange rate
        shares = amountToShares(tier, amount);
        if (shares == 0) revert ZeroShares();

        // Update pool state
        pool.totalDeposits += amount;
        pool.totalShares += shares;
        pool.availableLiquidity += amount;

        // Update user position
        UserPosition storage position = _userPositions[msg.sender][tier];
        position.shares += shares;
        position.depositedValue += amount;
        position.lastDepositAt = block.timestamp;

        // Transfer USDT
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, tier, amount, shares);
    }

    function withdraw(RiskTier tier, uint256 shares) external nonReentrant returns (uint256 amount) {
        Pool storage pool = _pools[tier];
        if (pool.maxPoolSize == 0) revert PoolNotInitialized();

        UserPosition storage position = _userPositions[msg.sender][tier];
        if (position.shares < shares) revert InsufficientShares();

        // Calculate USDT amount
        amount = sharesToAmount(tier, shares);
        if (amount == 0) revert InvalidAmount();
        if (pool.availableLiquidity < amount) revert InsufficientLiquidity();

        // Update pool state
        pool.totalShares -= shares;
        pool.totalDeposits -= amount;
        pool.availableLiquidity -= amount;

        // Update user position
        position.shares -= shares;
        position.depositedValue = (position.depositedValue * position.shares) / (position.shares + shares);

        // Transfer USDT
        stablecoin.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, tier, shares, amount);
    }

    function claimYield(RiskTier tier) external nonReentrant returns (uint256 amount) {
        UserPosition storage position = _userPositions[msg.sender][tier];
        amount = position.pendingYield;

        if (amount == 0) revert NoPendingYield();

        Pool storage pool = _pools[tier];
        if (pool.availableLiquidity < amount) revert InsufficientLiquidity();

        position.pendingYield = 0;
        position.totalYieldClaimed += amount;

        pool.availableLiquidity -= amount;

        stablecoin.safeTransfer(msg.sender, amount);

        emit YieldClaimed(msg.sender, tier, amount);
    }

    function compoundYield(RiskTier tier) external nonReentrant returns (uint256 newShares) {
        UserPosition storage position = _userPositions[msg.sender][tier];
        uint256 yieldAmount = position.pendingYield;

        if (yieldAmount == 0) revert NoPendingYield();

        Pool storage pool = _pools[tier];
        if (pool.maxPoolSize == 0) revert PoolNotInitialized();

        // Calculate new shares
        newShares = amountToShares(tier, yieldAmount);
        if (newShares == 0) revert ZeroShares();

        // Update pool state (yield is already in availableLiquidity)
        pool.totalShares += newShares;

        // Update user position
        position.shares += newShares;
        position.depositedValue += yieldAmount;
        position.pendingYield = 0;

        emit YieldCompounded(msg.sender, tier, yieldAmount, newShares);
    }

    // ============================================
    // Deployment (Only InvoiceXCore)
    // ============================================

    function deployLiquidity(
        RiskTier tier,
        uint256 amount,
        uint256 invoiceId,
        uint256 expectedReturn,
        uint256 dueDate
    ) external onlyRole(DEPLOYER_ROLE) returns (uint256 deploymentId) {
        Pool storage pool = _pools[tier];
        if (pool.maxPoolSize == 0) revert PoolNotInitialized();
        if (pool.availableLiquidity < amount) revert InsufficientLiquidity();
        if (amount == 0) revert InvalidAmount();

        deploymentId = _nextDeploymentId++;

        // Create deployment record
        _deployments[deploymentId] = Deployment({
            deploymentId: deploymentId,
            invoiceId: invoiceId,
            tier: tier,
            principalAmount: amount,
            expectedReturn: expectedReturn,
            actualReturn: 0,
            deployedAt: block.timestamp,
            expectedReturnDate: dueDate,
            returnedAt: 0,
            status: DeploymentStatus.ACTIVE
        });

        // Update pool state
        pool.availableLiquidity -= amount;
        pool.deployedLiquidity += amount;
        pool.pendingReturns += expectedReturn;

        // Track active deployments
        _activeDeploymentsByTier[tier].push(deploymentId);
        _deploymentsByInvoice[invoiceId].push(deploymentId);

        emit LiquidityDeployed(deploymentId, tier, invoiceId, amount);
    }

    function recordReturn(uint256 deploymentId, uint256 returnedAmount)
        external
        onlyRole(DEPLOYER_ROLE)
    {
        Deployment storage deployment = _deployments[deploymentId];
        if (deployment.deploymentId == 0) revert DeploymentNotFound();
        if (deployment.status != DeploymentStatus.ACTIVE) revert DeploymentNotActive();

        Pool storage pool = _pools[deployment.tier];

        uint256 yieldEarned = returnedAmount > deployment.principalAmount
            ? returnedAmount - deployment.principalAmount
            : 0;

        // Collect protocol fee
        uint256 protocolFee = (yieldEarned * protocolFeeBps) / BASIS_POINTS;
        uint256 netYield = yieldEarned - protocolFee;

        // Update deployment
        deployment.actualReturn = returnedAmount;
        deployment.returnedAt = block.timestamp;
        deployment.status = DeploymentStatus.RETURNED_FULL;

        // Update pool state
        pool.deployedLiquidity -= deployment.principalAmount;
        pool.pendingReturns -= deployment.expectedReturn;
        pool.availableLiquidity += returnedAmount - protocolFee;
        pool.totalYieldEarned += netYield;

        accumulatedProtocolFees += protocolFee;

        // Remove from active deployments
        _removeActiveDeployment(deployment.tier, deploymentId);

        emit LiquidityReturned(deploymentId, returnedAmount, yieldEarned);
        if (protocolFee > 0) {
            emit ProtocolFeeCollected(protocolFee);
        }
    }

    function recordDefault(uint256 deploymentId, uint256 recoveredAmount)
        external
        onlyRole(DEPLOYER_ROLE)
    {
        Deployment storage deployment = _deployments[deploymentId];
        if (deployment.deploymentId == 0) revert DeploymentNotFound();
        if (deployment.status != DeploymentStatus.ACTIVE) revert DeploymentNotActive();

        Pool storage pool = _pools[deployment.tier];

        uint256 lossAmount = deployment.principalAmount > recoveredAmount
            ? deployment.principalAmount - recoveredAmount
            : 0;

        // Update deployment
        deployment.actualReturn = recoveredAmount;
        deployment.returnedAt = block.timestamp;
        deployment.status = DeploymentStatus.DEFAULTED;

        // Update pool state
        pool.deployedLiquidity -= deployment.principalAmount;
        pool.pendingReturns -= deployment.expectedReturn;
        pool.availableLiquidity += recoveredAmount;
        pool.totalLosses += lossAmount;

        // Remove from active deployments
        _removeActiveDeployment(deployment.tier, deploymentId);

        emit DeploymentDefaulted(deploymentId, lossAmount, recoveredAmount);
    }

    function recordPartialReturn(uint256 deploymentId, uint256 partialAmount)
        external
        onlyRole(DEPLOYER_ROLE)
    {
        Deployment storage deployment = _deployments[deploymentId];
        if (deployment.deploymentId == 0) revert DeploymentNotFound();
        if (deployment.status != DeploymentStatus.ACTIVE) revert DeploymentNotActive();

        Pool storage pool = _pools[deployment.tier];

        uint256 yieldEarned = partialAmount > deployment.principalAmount
            ? partialAmount - deployment.principalAmount
            : 0;

        // Collect protocol fee
        uint256 protocolFee = (yieldEarned * protocolFeeBps) / BASIS_POINTS;
        uint256 lossAmount = deployment.principalAmount > partialAmount
            ? deployment.principalAmount - partialAmount
            : 0;

        // Update deployment
        deployment.actualReturn = partialAmount;
        deployment.returnedAt = block.timestamp;
        deployment.status = DeploymentStatus.RETURNED_PARTIAL;

        // Update pool state
        pool.deployedLiquidity -= deployment.principalAmount;
        pool.pendingReturns -= deployment.expectedReturn;
        pool.availableLiquidity += partialAmount - protocolFee;
        pool.totalLosses += lossAmount;

        if (yieldEarned > protocolFee) {
            pool.totalYieldEarned += (yieldEarned - protocolFee);
        }

        accumulatedProtocolFees += protocolFee;

        // Remove from active deployments
        _removeActiveDeployment(deployment.tier, deploymentId);

        emit LiquidityReturned(deploymentId, partialAmount, yieldEarned);
        if (protocolFee > 0) {
            emit ProtocolFeeCollected(protocolFee);
        }
    }

    // ============================================
    // View Functions
    // ============================================

    function getPool(RiskTier tier) external view returns (Pool memory) {
        return _pools[tier];
    }

    function getUserPosition(address user, RiskTier tier) external view returns (UserPosition memory) {
        return _userPositions[user][tier];
    }

    function getDeployment(uint256 deploymentId) external view returns (Deployment memory) {
        return _deployments[deploymentId];
    }

    function getAvailableLiquidity(RiskTier tier) external view returns (uint256) {
        return _pools[tier].availableLiquidity;
    }

    function getUtilizationRate(RiskTier tier) external view returns (uint256) {
        Pool storage pool = _pools[tier];
        if (pool.totalDeposits == 0) return 0;
        return (pool.deployedLiquidity * BASIS_POINTS) / pool.totalDeposits;
    }

    function sharesToAmount(RiskTier tier, uint256 shares) public view returns (uint256) {
        return (shares * _getExchangeRate(tier)) / PRECISION;
    }

    function amountToShares(RiskTier tier, uint256 amount) public view returns (uint256) {
        return (amount * PRECISION) / _getExchangeRate(tier);
    }

    function getExchangeRate(RiskTier tier) external view returns (uint256) {
        return _getExchangeRate(tier);
    }

    function getPendingYield(address user, RiskTier tier) external view returns (uint256) {
        return _userPositions[user][tier].pendingYield;
    }

    function getEffectiveAPY(RiskTier tier) external view returns (uint256) {
        Pool storage pool = _pools[tier];
        if (pool.totalDeposits == 0 || block.timestamp <= pool.lastYieldDistribution) return 0;

        uint256 timeElapsed = block.timestamp - pool.lastYieldDistribution;
        if (timeElapsed == 0) return 0;

        uint256 netYield = pool.totalYieldEarned > pool.totalLosses
            ? pool.totalYieldEarned - pool.totalLosses
            : 0;

        if (netYield == 0) return 0;

        // APY = (netYield / totalDeposits) * (SECONDS_PER_YEAR / timeElapsed) * BASIS_POINTS
        return (netYield * SECONDS_PER_YEAR * BASIS_POINTS) / (pool.totalDeposits * timeElapsed);
    }

    function getTotalValueLocked() external view returns (uint256) {
        uint256 total = 0;
        total += _pools[RiskTier.TIER_A].totalDeposits;
        total += _pools[RiskTier.TIER_B].totalDeposits;
        total += _pools[RiskTier.TIER_C].totalDeposits;
        return total;
    }

    function getActiveDeployments(RiskTier tier) external view returns (uint256[] memory) {
        return _activeDeploymentsByTier[tier];
    }

    function getDeploymentsForInvoice(uint256 invoiceId) external view returns (uint256[] memory) {
        return _deploymentsByInvoice[invoiceId];
    }

    function canWithdraw(address user, RiskTier tier, uint256 shares)
        external
        view
        returns (bool, string memory)
    {
        Pool storage pool = _pools[tier];
        UserPosition storage position = _userPositions[user][tier];

        if (pool.maxPoolSize == 0) {
            return (false, "Pool not initialized");
        }

        if (position.shares < shares) {
            return (false, "Insufficient shares");
        }

        uint256 amount = sharesToAmount(tier, shares);
        if (pool.availableLiquidity < amount) {
            return (false, "Insufficient liquidity in pool");
        }

        return (true, "");
    }

    // ============================================
    // Admin
    // ============================================

    function setProtocolFee(uint256 feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (feeBps > BASIS_POINTS) revert InvalidAmount();
        protocolFeeBps = feeBps;
    }

    function withdrawProtocolFees(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert InvalidAmount();
        uint256 amount = accumulatedProtocolFees;
        if (amount == 0) revert InvalidAmount();

        accumulatedProtocolFees = 0;
        stablecoin.safeTransfer(to, amount);
    }

    function emergencyWithdraw(RiskTier tier, address to, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (to == address(0)) revert InvalidAmount();
        if (amount == 0) revert InvalidAmount();

        Pool storage pool = _pools[tier];
        if (pool.availableLiquidity < amount) revert InsufficientLiquidity();

        pool.availableLiquidity -= amount;
        stablecoin.safeTransfer(to, amount);
    }

    // ============================================
    // Internal Functions
    // ============================================

    function _getExchangeRate(RiskTier tier) internal view returns (uint256) {
        Pool storage pool = _pools[tier];
        if (pool.totalShares == 0) return PRECISION; // 1:1 initially

        uint256 totalValue = pool.totalDeposits + pool.totalYieldEarned;
        if (totalValue > pool.totalLosses) {
            totalValue -= pool.totalLosses;
        } else {
            totalValue = 0;
        }

        return (totalValue * PRECISION) / pool.totalShares;
    }

    function _removeActiveDeployment(RiskTier tier, uint256 deploymentId) internal {
        uint256[] storage activeDeployments = _activeDeploymentsByTier[tier];
        uint256 length = activeDeployments.length;

        for (uint256 i = 0; i < length; i++) {
            if (activeDeployments[i] == deploymentId) {
                activeDeployments[i] = activeDeployments[length - 1];
                activeDeployments.pop();
                break;
            }
        }
    }
}
