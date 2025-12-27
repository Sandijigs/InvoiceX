// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title InsurancePool
 * @notice Decentralized insurance pool protecting LPs against invoice defaults
 * @dev Funded by premiums from factored invoices and stakers seeking insurance yields
 */
contract InsurancePool is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // State Variables
    // ============================================

    IERC20 public immutable stablecoin;
    address public invoiceToken;
    address public liquidityPool;

    uint256 public minReserveRatio;
    uint256 public minStakeLockDays;

    uint256 private _nextCoverageId;
    uint256 private _nextClaimId;

    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_PER_DAY = 86400;

    // ============================================
    // Data Structures
    // ============================================

    enum CoverageTier {
        BASIC,      // 50% coverage, 0.5% premium
        STANDARD,   // 75% coverage, 1.0% premium
        PREMIUM     // 100% coverage, 1.5% premium
    }

    enum CoverageStatus {
        ACTIVE,
        EXPIRED,
        CLAIMED,
        CANCELLED
    }

    enum ClaimStatus {
        PENDING,
        APPROVED,
        PAID,
        REJECTED,
        PARTIALLY_PAID
    }

    struct Coverage {
        uint256 coverageId;
        uint256 invoiceId;
        CoverageTier tier;
        uint256 coverageAmount;
        uint256 premiumPaid;
        uint256 startDate;
        uint256 endDate;
        CoverageStatus status;
        uint256 claimAmount;
        uint256 claimedAt;
    }

    struct StakerPosition {
        uint256 stakedAmount;
        uint256 shares;
        uint256 stakedAt;
        uint256 lockEndTime;
        uint256 pendingYield;
        uint256 totalYieldClaimed;
    }

    struct PoolMetrics {
        uint256 totalStaked;
        uint256 totalShares;
        uint256 totalPremiumsCollected;
        uint256 totalClaimsPaid;
        uint256 activeCoverageCount;
        uint256 activeCoverageAmount;
        uint256 availableCapital;
        uint256 reserveRatio;
        uint256 currentAPY;
    }

    struct Claim {
        uint256 claimId;
        uint256 invoiceId;
        uint256 coverageId;
        uint256 requestedAmount;
        uint256 approvedAmount;
        uint256 filedAt;
        uint256 processedAt;
        ClaimStatus status;
        string notes;
    }

    struct TierConfig {
        uint256 coveragePercentBps;
        uint256 premiumRateBps;
    }

    // ============================================
    // Storage
    // ============================================

    mapping(uint256 => Coverage) private _coverages;
    mapping(uint256 => uint256) private _invoiceToCoverage;
    mapping(uint256 => Claim) private _claims;
    mapping(address => StakerPosition) private _stakers;
    mapping(CoverageTier => TierConfig) private _tierConfigs;

    PoolMetrics private _metrics;

    // ============================================
    // Access Control Roles
    // ============================================

    bytes32 public constant COVERAGE_MANAGER_ROLE = keccak256("COVERAGE_MANAGER_ROLE");
    bytes32 public constant CLAIMS_FILER_ROLE = keccak256("CLAIMS_FILER_ROLE");
    bytes32 public constant CLAIMS_APPROVER_ROLE = keccak256("CLAIMS_APPROVER_ROLE");
    bytes32 public constant CLAIMS_PROCESSOR_ROLE = keccak256("CLAIMS_PROCESSOR_ROLE");

    // ============================================
    // Events
    // ============================================

    event Staked(address indexed staker, uint256 amount, uint256 shares, uint256 lockEndTime);
    event Unstaked(address indexed staker, uint256 shares, uint256 amount);
    event StakingYieldClaimed(address indexed staker, uint256 amount);
    event LockExtended(address indexed staker, uint256 newLockEndTime);
    event CoveragePurchased(uint256 indexed coverageId, uint256 indexed invoiceId, CoverageTier tier, uint256 premium);
    event CoverageRenewed(uint256 indexed coverageId, uint256 newEndDate);
    event CoverageCancelled(uint256 indexed coverageId, uint256 refund);
    event ClaimFiled(uint256 indexed claimId, uint256 indexed invoiceId, uint256 requestedAmount);
    event ClaimApproved(uint256 indexed claimId, uint256 approvedAmount);
    event ClaimPaid(uint256 indexed claimId, uint256 paidAmount);
    event ClaimRejected(uint256 indexed claimId, string reason);
    event PremiumCollected(uint256 indexed coverageId, uint256 amount);
    event ReserveRatioUpdated(uint256 newRatio);

    // ============================================
    // Custom Errors
    // ============================================

    error InsufficientStake();
    error StakeLocked();
    error WouldBreachReserveRatio();
    error CoverageNotFound();
    error CoverageNotActive();
    error CoverageExpired();
    error InvoiceNotCovered();
    error InvoiceNotDefaulted();
    error ClaimNotFound();
    error ClaimAlreadyProcessed();
    error ClaimNotApproved();
    error InsufficientPoolFunds();
    error CoverageAmountExceedsLimit();
    error PoolPaused();
    error ZeroAddress();
    error ZeroAmount();

    // ============================================
    // Constructor
    // ============================================

    constructor(
        address _stablecoin,
        address _invoiceToken,
        address _admin
    ) {
        if (_stablecoin == address(0)) revert ZeroAddress();
        if (_admin == address(0)) revert ZeroAddress();

        stablecoin = IERC20(_stablecoin);
        invoiceToken = _invoiceToken;

        // Default configuration
        minReserveRatio = 15000; // 150%
        minStakeLockDays = 30;

        // Initialize tier configs
        _tierConfigs[CoverageTier.BASIC] = TierConfig({
            coveragePercentBps: 5000,  // 50%
            premiumRateBps: 50         // 0.5%
        });
        _tierConfigs[CoverageTier.STANDARD] = TierConfig({
            coveragePercentBps: 7500,  // 75%
            premiumRateBps: 100        // 1.0%
        });
        _tierConfigs[CoverageTier.PREMIUM] = TierConfig({
            coveragePercentBps: 10000, // 100%
            premiumRateBps: 150        // 1.5%
        });

        _nextCoverageId = 1;
        _nextClaimId = 1;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(COVERAGE_MANAGER_ROLE, _admin);
        _grantRole(CLAIMS_APPROVER_ROLE, _admin);
        _grantRole(CLAIMS_PROCESSOR_ROLE, _admin);
    }

    // ============================================
    // Staking Functions
    // ============================================

    function stake(uint256 amount) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (amount == 0) revert ZeroAmount();

        // Calculate shares
        if (_metrics.totalShares == 0) {
            shares = amount; // 1:1 initial
        } else {
            shares = (amount * _metrics.totalShares) / _metrics.totalStaked;
        }

        // Update staker position
        StakerPosition storage position = _stakers[msg.sender];
        position.stakedAmount += amount;
        position.shares += shares;
        if (position.stakedAt == 0) {
            position.stakedAt = block.timestamp;
        }
        position.lockEndTime = block.timestamp + (minStakeLockDays * SECONDS_PER_DAY);

        // Update metrics
        _metrics.totalStaked += amount;
        _metrics.totalShares += shares;
        _updateAvailableCapital();

        // Transfer tokens
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount, shares, position.lockEndTime);

        return shares;
    }

    function unstake(uint256 shares) external nonReentrant whenNotPaused returns (uint256 amount) {
        StakerPosition storage position = _stakers[msg.sender];

        if (position.shares < shares) revert InsufficientStake();
        if (block.timestamp < position.lockEndTime) revert StakeLocked();

        // Calculate amount
        amount = (shares * _metrics.totalStaked) / _metrics.totalShares;

        // Check if unstaking would breach reserve ratio
        uint256 newTotalStaked = _metrics.totalStaked - amount;
        if (_metrics.activeCoverageAmount > 0) {
            uint256 newReserveRatio = (newTotalStaked * BASIS_POINTS) / _metrics.activeCoverageAmount;
            if (newReserveRatio < minReserveRatio) revert WouldBreachReserveRatio();
        }

        // Update position
        position.stakedAmount -= amount;
        position.shares -= shares;

        // Update metrics
        _metrics.totalStaked -= amount;
        _metrics.totalShares -= shares;
        _updateAvailableCapital();

        // Transfer tokens
        stablecoin.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, shares, amount);

        return amount;
    }

    function claimStakingYield() external nonReentrant whenNotPaused returns (uint256 yield) {
        StakerPosition storage position = _stakers[msg.sender];

        yield = position.pendingYield;
        if (yield == 0) revert ZeroAmount();

        position.pendingYield = 0;
        position.totalYieldClaimed += yield;

        stablecoin.safeTransfer(msg.sender, yield);

        emit StakingYieldClaimed(msg.sender, yield);

        return yield;
    }

    function extendLock(uint256 additionalDays) external {
        StakerPosition storage position = _stakers[msg.sender];
        if (position.shares == 0) revert InsufficientStake();

        uint256 extensionSeconds = additionalDays * SECONDS_PER_DAY;
        position.lockEndTime += extensionSeconds;

        emit LockExtended(msg.sender, position.lockEndTime);
    }

    // ============================================
    // Coverage Functions
    // ============================================

    function purchaseCoverage(
        uint256 invoiceId,
        CoverageTier tier,
        uint256 coverageAmount
    ) external nonReentrant whenNotPaused onlyRole(COVERAGE_MANAGER_ROLE) returns (uint256 coverageId) {
        if (coverageAmount == 0) revert ZeroAmount();

        // Check if can purchase coverage
        if (!canPurchaseCoverage(coverageAmount)) revert WouldBreachReserveRatio();

        // Calculate premium (assuming 60 day default duration)
        uint256 premium = calculatePremium(tier, coverageAmount, 60);

        // Create coverage
        coverageId = _nextCoverageId++;

        _coverages[coverageId] = Coverage({
            coverageId: coverageId,
            invoiceId: invoiceId,
            tier: tier,
            coverageAmount: coverageAmount,
            premiumPaid: premium,
            startDate: block.timestamp,
            endDate: block.timestamp + (90 * SECONDS_PER_DAY), // 90 day default
            status: CoverageStatus.ACTIVE,
            claimAmount: 0,
            claimedAt: 0
        });

        _invoiceToCoverage[invoiceId] = coverageId;

        // Update metrics
        _metrics.activeCoverageCount++;
        _metrics.activeCoverageAmount += coverageAmount;
        _metrics.totalPremiumsCollected += premium;
        _updateAvailableCapital();

        // Distribute premium to stakers
        _distributePremium(premium);

        emit CoveragePurchased(coverageId, invoiceId, tier, premium);
        emit PremiumCollected(coverageId, premium);

        return coverageId;
    }

    function renewCoverage(
        uint256 coverageId,
        uint256 newEndDate
    ) external onlyRole(COVERAGE_MANAGER_ROLE) {
        Coverage storage coverage = _coverages[coverageId];
        if (coverage.coverageId == 0) revert CoverageNotFound();
        if (coverage.status != CoverageStatus.ACTIVE) revert CoverageNotActive();

        coverage.endDate = newEndDate;

        emit CoverageRenewed(coverageId, newEndDate);
    }

    function cancelCoverage(uint256 coverageId) external onlyRole(COVERAGE_MANAGER_ROLE) returns (uint256 refund) {
        Coverage storage coverage = _coverages[coverageId];
        if (coverage.coverageId == 0) revert CoverageNotFound();
        if (coverage.status != CoverageStatus.ACTIVE) revert CoverageNotActive();

        // Calculate pro-rata refund
        uint256 totalDuration = coverage.endDate - coverage.startDate;
        uint256 remainingDuration = coverage.endDate > block.timestamp ? coverage.endDate - block.timestamp : 0;
        refund = (coverage.premiumPaid * remainingDuration) / totalDuration;

        // Update coverage
        coverage.status = CoverageStatus.CANCELLED;

        // Update metrics
        _metrics.activeCoverageCount--;
        _metrics.activeCoverageAmount -= coverage.coverageAmount;
        _updateAvailableCapital();

        // Transfer refund
        if (refund > 0) {
            stablecoin.safeTransfer(msg.sender, refund);
        }

        emit CoverageCancelled(coverageId, refund);

        return refund;
    }

    // ============================================
    // Claims Functions
    // ============================================

    function fileClaim(
        uint256 invoiceId,
        uint256 requestedAmount
    ) external onlyRole(CLAIMS_FILER_ROLE) returns (uint256 claimId) {
        uint256 coverageId = _invoiceToCoverage[invoiceId];
        if (coverageId == 0) revert InvoiceNotCovered();

        Coverage storage coverage = _coverages[coverageId];
        if (coverage.status != CoverageStatus.ACTIVE) revert CoverageNotActive();

        // Create claim
        claimId = _nextClaimId++;

        _claims[claimId] = Claim({
            claimId: claimId,
            invoiceId: invoiceId,
            coverageId: coverageId,
            requestedAmount: requestedAmount,
            approvedAmount: 0,
            filedAt: block.timestamp,
            processedAt: 0,
            status: ClaimStatus.PENDING,
            notes: ""
        });

        emit ClaimFiled(claimId, invoiceId, requestedAmount);

        return claimId;
    }

    function approveClaim(
        uint256 claimId,
        uint256 approvedAmount
    ) external onlyRole(CLAIMS_APPROVER_ROLE) {
        Claim storage claim = _claims[claimId];
        if (claim.claimId == 0) revert ClaimNotFound();
        if (claim.status != ClaimStatus.PENDING) revert ClaimAlreadyProcessed();

        Coverage storage coverage = _coverages[claim.coverageId];

        // Cap approved amount at coverage amount
        if (approvedAmount > coverage.coverageAmount) {
            approvedAmount = coverage.coverageAmount;
        }

        // Check pool has sufficient funds
        if (_metrics.availableCapital < approvedAmount) revert InsufficientPoolFunds();

        claim.approvedAmount = approvedAmount;
        claim.status = ClaimStatus.APPROVED;

        emit ClaimApproved(claimId, approvedAmount);
    }

    function processClaim(uint256 claimId) external nonReentrant {
        Claim storage claim = _claims[claimId];
        if (claim.claimId == 0) revert ClaimNotFound();
        if (claim.status != ClaimStatus.APPROVED) revert ClaimNotApproved();

        Coverage storage coverage = _coverages[claim.coverageId];

        uint256 payout = claim.approvedAmount;

        // Update claim
        claim.status = ClaimStatus.PAID;
        claim.processedAt = block.timestamp;

        // Update coverage
        coverage.status = CoverageStatus.CLAIMED;
        coverage.claimAmount = payout;
        coverage.claimedAt = block.timestamp;

        // Update metrics
        _metrics.activeCoverageCount--;
        _metrics.activeCoverageAmount -= coverage.coverageAmount;
        _metrics.totalClaimsPaid += payout;
        _metrics.totalStaked -= payout; // Reduce pool capital
        _updateAvailableCapital();

        // Transfer payout to liquidity pool
        if (liquidityPool != address(0)) {
            stablecoin.safeTransfer(liquidityPool, payout);
        }

        emit ClaimPaid(claimId, payout);
    }

    function rejectClaim(
        uint256 claimId,
        string calldata reason
    ) external onlyRole(CLAIMS_APPROVER_ROLE) {
        Claim storage claim = _claims[claimId];
        if (claim.claimId == 0) revert ClaimNotFound();
        if (claim.status != ClaimStatus.PENDING) revert ClaimAlreadyProcessed();

        claim.status = ClaimStatus.REJECTED;
        claim.notes = reason;

        emit ClaimRejected(claimId, reason);
    }

    function processClaimDirect(uint256 invoiceId) external nonReentrant onlyRole(CLAIMS_PROCESSOR_ROLE) {
        uint256 coverageId = _invoiceToCoverage[invoiceId];
        if (coverageId == 0) revert InvoiceNotCovered();

        Coverage storage coverage = _coverages[coverageId];
        uint256 requestedAmount = coverage.coverageAmount;

        // File claim
        uint256 claimId = _nextClaimId++;
        _claims[claimId] = Claim({
            claimId: claimId,
            invoiceId: invoiceId,
            coverageId: coverageId,
            requestedAmount: requestedAmount,
            approvedAmount: requestedAmount,
            filedAt: block.timestamp,
            processedAt: block.timestamp,
            status: ClaimStatus.PAID,
            notes: "Auto-processed"
        });

        // Update coverage
        coverage.status = CoverageStatus.CLAIMED;
        coverage.claimAmount = requestedAmount;
        coverage.claimedAt = block.timestamp;

        // Update metrics
        _metrics.activeCoverageCount--;
        _metrics.activeCoverageAmount -= coverage.coverageAmount;
        _metrics.totalClaimsPaid += requestedAmount;
        _metrics.totalStaked -= requestedAmount;
        _updateAvailableCapital();

        // Transfer payout
        if (liquidityPool != address(0)) {
            stablecoin.safeTransfer(liquidityPool, requestedAmount);
        }

        emit ClaimFiled(claimId, invoiceId, requestedAmount);
        emit ClaimApproved(claimId, requestedAmount);
        emit ClaimPaid(claimId, requestedAmount);
    }

    // ============================================
    // View Functions
    // ============================================

    function getCoverage(uint256 coverageId) external view returns (Coverage memory) {
        return _coverages[coverageId];
    }

    function getCoverageByInvoice(uint256 invoiceId) external view returns (Coverage memory) {
        uint256 coverageId = _invoiceToCoverage[invoiceId];
        return _coverages[coverageId];
    }

    function getClaim(uint256 claimId) external view returns (Claim memory) {
        return _claims[claimId];
    }

    function getStakerPosition(address staker) external view returns (StakerPosition memory) {
        return _stakers[staker];
    }

    function getPoolMetrics() external view returns (PoolMetrics memory) {
        return _metrics;
    }

    function calculatePremium(
        CoverageTier tier,
        uint256 coverageAmount,
        uint256 durationDays
    ) public view returns (uint256) {
        TierConfig memory config = _tierConfigs[tier];

        // Premium = coverageAmount * premiumRate * (durationDays / 365)
        uint256 annualPremium = (coverageAmount * config.premiumRateBps) / BASIS_POINTS;
        uint256 premium = (annualPremium * durationDays) / 365;

        return premium;
    }

    function getMaxCoverage(CoverageTier tier, uint256 invoiceValue) external view returns (uint256) {
        TierConfig memory config = _tierConfigs[tier];
        return (invoiceValue * config.coveragePercentBps) / BASIS_POINTS;
    }

    function isCovered(uint256 invoiceId) external view returns (bool) {
        uint256 coverageId = _invoiceToCoverage[invoiceId];
        if (coverageId == 0) return false;

        Coverage memory coverage = _coverages[coverageId];
        return coverage.status == CoverageStatus.ACTIVE;
    }

    function getReserveRatio() public view returns (uint256) {
        if (_metrics.activeCoverageAmount == 0) return type(uint256).max;
        return (_metrics.totalStaked * BASIS_POINTS) / _metrics.activeCoverageAmount;
    }

    function canPurchaseCoverage(uint256 coverageAmount) public view returns (bool) {
        uint256 newActiveCoverage = _metrics.activeCoverageAmount + coverageAmount;
        if (newActiveCoverage == 0) return true;

        uint256 newReserveRatio = (_metrics.totalStaked * BASIS_POINTS) / newActiveCoverage;
        return newReserveRatio >= minReserveRatio;
    }

    function canUnstake(address staker, uint256 shares) external view returns (bool, string memory reason) {
        StakerPosition memory position = _stakers[staker];

        if (position.shares < shares) {
            return (false, "Insufficient shares");
        }

        if (block.timestamp < position.lockEndTime) {
            return (false, "Stake still locked");
        }

        uint256 amount = (shares * _metrics.totalStaked) / _metrics.totalShares;
        uint256 newTotalStaked = _metrics.totalStaked - amount;

        if (_metrics.activeCoverageAmount > 0) {
            uint256 newReserveRatio = (newTotalStaked * BASIS_POINTS) / _metrics.activeCoverageAmount;
            if (newReserveRatio < minReserveRatio) {
                return (false, "Would breach reserve ratio");
            }
        }

        return (true, "");
    }

    function getPendingYield(address staker) external view returns (uint256) {
        return _stakers[staker].pendingYield;
    }

    function getStakerAPY() external view returns (uint256) {
        if (_metrics.totalStaked == 0) return 0;

        // APY based on premiums collected in last period
        // Simplified: (totalPremiums / totalStaked) * 100
        return (_metrics.totalPremiumsCollected * BASIS_POINTS) / _metrics.totalStaked;
    }

    // ============================================
    // Admin Functions
    // ============================================

    function setMinReserveRatio(uint256 ratioBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minReserveRatio = ratioBps;
        emit ReserveRatioUpdated(ratioBps);
    }

    function setPremiumRates(
        CoverageTier tier,
        uint256 rateBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _tierConfigs[tier].premiumRateBps = rateBps;
    }

    function setMinStakeLockDays(uint256 days_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minStakeLockDays = days_;
    }

    function setLiquidityPoolAddress(address pool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (pool == address(0)) revert ZeroAddress();
        liquidityPool = pool;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ============================================
    // Internal Helper Functions
    // ============================================

    function _updateAvailableCapital() private {
        _metrics.availableCapital = _metrics.totalStaked;
        _metrics.reserveRatio = getReserveRatio();
    }

    function _distributePremium(uint256 premium) private {
        if (_metrics.totalShares == 0) return;

        // Distribute premium proportionally to all stakers
        // For simplicity, we'll add to a pool that stakers can claim
        // In production, this would update each staker's pending yield

        // For now, just track that premium was collected
        // Individual yield distribution would be calculated based on share ownership
    }
}
