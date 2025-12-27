// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/defi/InsurancePool.sol";
import "../helpers/TestHelper.sol";
import "../mocks/MockUSDT.sol";

contract InsurancePoolTest is TestHelper {
    InsurancePool public pool;
    MockUSDT public usdt;

    uint256 constant STAKE_AMOUNT = 100_000 * 1e6; // $100,000
    uint256 constant COVERAGE_AMOUNT = 50_000 * 1e6; // $50,000
    uint256 constant INVOICE_ID = 1;

    bytes32 public constant COVERAGE_MANAGER_ROLE = keccak256("COVERAGE_MANAGER_ROLE");
    bytes32 public constant CLAIMS_FILER_ROLE = keccak256("CLAIMS_FILER_ROLE");
    bytes32 public constant CLAIMS_APPROVER_ROLE = keccak256("CLAIMS_APPROVER_ROLE");
    bytes32 public constant CLAIMS_PROCESSOR_ROLE = keccak256("CLAIMS_PROCESSOR_ROLE");

    // Events
    event Staked(address indexed staker, uint256 amount, uint256 shares, uint256 lockEndTime);
    event Unstaked(address indexed staker, uint256 shares, uint256 amount);
    event CoveragePurchased(uint256 indexed coverageId, uint256 indexed invoiceId, InsurancePool.CoverageTier tier, uint256 premium);
    event ClaimFiled(uint256 indexed claimId, uint256 indexed invoiceId, uint256 requestedAmount);

    function setUp() public override {
        super.setUp();

        // Deploy mocks
        usdt = new MockUSDT();

        // Deploy InsurancePool
        vm.prank(admin);
        pool = new InsurancePool(
            address(usdt),
            address(0x1), // Mock invoice token
            admin
        );

        // Grant roles
        vm.startPrank(admin);
        pool.grantRole(COVERAGE_MANAGER_ROLE, operator);
        pool.grantRole(CLAIMS_FILER_ROLE, operator);
        pool.grantRole(CLAIMS_APPROVER_ROLE, admin);
        pool.grantRole(CLAIMS_PROCESSOR_ROLE, admin);
        vm.stopPrank();

        // Fund test accounts
        usdt.mint(investor1, 1_000_000 * 1e6);
        usdt.mint(investor2, 1_000_000 * 1e6);
        usdt.mint(operator, 1_000_000 * 1e6);
    }

    // ============================================
    // Constructor Tests
    // ============================================

    function test_Constructor_SetsVariables() public view {
        assertEq(address(pool.stablecoin()), address(usdt));
        assertEq(pool.minReserveRatio(), 15000); // 150%
        assertEq(pool.minStakeLockDays(), 30);
    }

    function test_Constructor_GrantsRoles() public view {
        assertTrue(pool.hasRole(pool.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(pool.hasRole(COVERAGE_MANAGER_ROLE, admin));
        assertTrue(pool.hasRole(CLAIMS_APPROVER_ROLE, admin));
    }

    // ============================================
    // Staking Tests
    // ============================================

    function test_Stake_Success() public {
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);

        uint256 shares = pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        assertEq(shares, STAKE_AMOUNT); // 1:1 for first stake

        InsurancePool.StakerPosition memory position = pool.getStakerPosition(investor1);
        assertEq(position.stakedAmount, STAKE_AMOUNT);
        assertEq(position.shares, shares);
    }

    function test_Stake_EmitsEvent() public {
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);

        vm.expectEmit(true, false, false, false);
        emit Staked(investor1, STAKE_AMOUNT, STAKE_AMOUNT, block.timestamp + 30 days);

        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();
    }

    function test_Stake_CalculatesSharesCorrectly() public {
        // First stake
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        uint256 shares1 = pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        // Second stake (same amount)
        vm.startPrank(investor2);
        usdt.approve(address(pool), STAKE_AMOUNT);
        uint256 shares2 = pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        // Should get same shares for same amount
        assertEq(shares1, shares2);
    }

    function test_Stake_SetsLockPeriod() public {
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        InsurancePool.StakerPosition memory position = pool.getStakerPosition(investor1);
        assertEq(position.lockEndTime, block.timestamp + 30 days);
    }

    function test_Unstake_Success() public {
        // Stake first
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        uint256 shares = pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        // Fast forward past lock period
        vm.warp(block.timestamp + 31 days);

        // Unstake
        uint256 balanceBefore = usdt.balanceOf(investor1);

        vm.prank(investor1);
        uint256 amount = pool.unstake(shares);

        uint256 balanceAfter = usdt.balanceOf(investor1);
        assertEq(balanceAfter - balanceBefore, amount);
        assertEq(amount, STAKE_AMOUNT);
    }

    function test_Unstake_RevertWhen_Locked() public {
        // Stake
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        uint256 shares = pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        // Try to unstake immediately (still locked)
        vm.expectRevert(InsurancePool.StakeLocked.selector);
        vm.prank(investor1);
        pool.unstake(shares);
    }

    function test_Unstake_RevertWhen_BreachesReserve() public {
        // Stake
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        uint256 shares = pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        // Purchase coverage (creates obligation)
        vm.prank(operator);
        pool.purchaseCoverage(INVOICE_ID, InsurancePool.CoverageTier.STANDARD, 60_000 * 1e6);

        // Fast forward past lock
        vm.warp(block.timestamp + 31 days);

        // Try to unstake all (would breach reserve ratio)
        vm.expectRevert(InsurancePool.WouldBreachReserveRatio.selector);
        vm.prank(investor1);
        pool.unstake(shares);
    }

    function test_ClaimStakingYield_Success() public {
        // This test is simplified since yield distribution is not fully implemented
        // In production, premiums would be distributed to stakers

        // For now, just test the revert when no yield
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);

        vm.expectRevert(InsurancePool.ZeroAmount.selector);
        pool.claimStakingYield();
        vm.stopPrank();
    }

    function test_ExtendLock_Success() public {
        // Stake
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);

        InsurancePool.StakerPosition memory positionBefore = pool.getStakerPosition(investor1);

        // Extend lock
        pool.extendLock(30);

        InsurancePool.StakerPosition memory positionAfter = pool.getStakerPosition(investor1);
        assertEq(positionAfter.lockEndTime, positionBefore.lockEndTime + 30 days);
        vm.stopPrank();
    }

    // ============================================
    // Coverage Tests
    // ============================================

    function test_PurchaseCoverage_Success() public {
        // Stake to provide capital
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        // Purchase coverage
        vm.prank(operator);
        uint256 coverageId = pool.purchaseCoverage(
            INVOICE_ID,
            InsurancePool.CoverageTier.STANDARD,
            COVERAGE_AMOUNT
        );

        assertEq(coverageId, 1);

        InsurancePool.Coverage memory coverage = pool.getCoverage(coverageId);
        assertEq(coverage.invoiceId, INVOICE_ID);
        assertEq(coverage.coverageAmount, COVERAGE_AMOUNT);
        assertTrue(coverage.status == InsurancePool.CoverageStatus.ACTIVE);
    }

    function test_PurchaseCoverage_EmitsEvent() public {
        // Stake
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        // Calculate expected premium
        uint256 premium = pool.calculatePremium(
            InsurancePool.CoverageTier.STANDARD,
            COVERAGE_AMOUNT,
            60
        );

        vm.expectEmit(true, true, false, true);
        emit CoveragePurchased(1, INVOICE_ID, InsurancePool.CoverageTier.STANDARD, premium);

        vm.prank(operator);
        pool.purchaseCoverage(INVOICE_ID, InsurancePool.CoverageTier.STANDARD, COVERAGE_AMOUNT);
    }

    function test_PurchaseCoverage_CorrectPremium() public {
        // Stake
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        // Purchase coverage
        vm.prank(operator);
        uint256 coverageId = pool.purchaseCoverage(
            INVOICE_ID,
            InsurancePool.CoverageTier.STANDARD,
            COVERAGE_AMOUNT
        );

        InsurancePool.Coverage memory coverage = pool.getCoverage(coverageId);

        // Standard tier: 1% premium, 60 days
        // Expected: $50,000 * 1% * (60/365) = $82.19
        uint256 expectedPremium = (COVERAGE_AMOUNT * 100 * 60) / (10000 * 365);
        assertEq(coverage.premiumPaid, expectedPremium);
    }

    function test_PurchaseCoverage_RevertWhen_ExceedsCapacity() public {
        // Stake small amount
        vm.startPrank(investor1);
        usdt.approve(address(pool), 10_000 * 1e6);
        pool.stake(10_000 * 1e6);
        vm.stopPrank();

        // Try to purchase large coverage (would breach reserve ratio)
        vm.expectRevert(InsurancePool.WouldBreachReserveRatio.selector);
        vm.prank(operator);
        pool.purchaseCoverage(INVOICE_ID, InsurancePool.CoverageTier.STANDARD, 100_000 * 1e6);
    }

    function test_CancelCoverage_Success() public {
        // Stake and purchase coverage
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        vm.prank(operator);
        uint256 coverageId = pool.purchaseCoverage(
            INVOICE_ID,
            InsurancePool.CoverageTier.STANDARD,
            COVERAGE_AMOUNT
        );

        // Cancel immediately (should get full refund)
        vm.prank(operator);
        uint256 refund = pool.cancelCoverage(coverageId);

        InsurancePool.Coverage memory coverage = pool.getCoverage(coverageId);
        assertTrue(coverage.status == InsurancePool.CoverageStatus.CANCELLED);
        assertGt(refund, 0);
    }

    function test_CancelCoverage_RefundsCorrectly() public {
        // Stake and purchase coverage
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        vm.prank(operator);
        uint256 coverageId = pool.purchaseCoverage(
            INVOICE_ID,
            InsurancePool.CoverageTier.STANDARD,
            COVERAGE_AMOUNT
        );

        InsurancePool.Coverage memory coverage = pool.getCoverage(coverageId);
        uint256 totalDuration = coverage.endDate - coverage.startDate;

        // Wait half the duration
        vm.warp(block.timestamp + (totalDuration / 2));

        // Cancel (should get ~50% refund)
        vm.prank(operator);
        uint256 refund = pool.cancelCoverage(coverageId);

        // Refund should be approximately half the premium
        uint256 expectedRefund = coverage.premiumPaid / 2;
        assertApproxEqRel(refund, expectedRefund, 0.01e18); // 1% tolerance
    }

    // ============================================
    // Claims Tests
    // ============================================

    function test_FileClaim_Success() public {
        // Setup: Stake and purchase coverage
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        vm.prank(operator);
        pool.purchaseCoverage(INVOICE_ID, InsurancePool.CoverageTier.STANDARD, COVERAGE_AMOUNT);

        // File claim
        vm.prank(operator);
        uint256 claimId = pool.fileClaim(INVOICE_ID, COVERAGE_AMOUNT);

        assertEq(claimId, 1);

        InsurancePool.Claim memory claim = pool.getClaim(claimId);
        assertEq(claim.invoiceId, INVOICE_ID);
        assertEq(claim.requestedAmount, COVERAGE_AMOUNT);
        assertTrue(claim.status == InsurancePool.ClaimStatus.PENDING);
    }

    function test_FileClaim_EmitsEvent() public {
        // Setup
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        vm.prank(operator);
        pool.purchaseCoverage(INVOICE_ID, InsurancePool.CoverageTier.STANDARD, COVERAGE_AMOUNT);

        // File claim
        vm.expectEmit(true, true, false, true);
        emit ClaimFiled(1, INVOICE_ID, COVERAGE_AMOUNT);

        vm.prank(operator);
        pool.fileClaim(INVOICE_ID, COVERAGE_AMOUNT);
    }

    function test_FileClaim_RevertWhen_NotCovered() public {
        vm.expectRevert(InsurancePool.InvoiceNotCovered.selector);
        vm.prank(operator);
        pool.fileClaim(999, COVERAGE_AMOUNT); // Non-existent invoice
    }

    function test_ApproveClaim_Success() public {
        // Setup and file claim
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        vm.prank(operator);
        pool.purchaseCoverage(INVOICE_ID, InsurancePool.CoverageTier.STANDARD, COVERAGE_AMOUNT);

        vm.prank(operator);
        uint256 claimId = pool.fileClaim(INVOICE_ID, COVERAGE_AMOUNT);

        // Approve claim
        vm.prank(admin);
        pool.approveClaim(claimId, COVERAGE_AMOUNT);

        InsurancePool.Claim memory claim = pool.getClaim(claimId);
        assertTrue(claim.status == InsurancePool.ClaimStatus.APPROVED);
        assertEq(claim.approvedAmount, COVERAGE_AMOUNT);
    }

    function test_ProcessClaim_Success() public {
        // Setup, file, and approve claim
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        vm.prank(operator);
        uint256 coverageId = pool.purchaseCoverage(INVOICE_ID, InsurancePool.CoverageTier.STANDARD, COVERAGE_AMOUNT);

        vm.prank(operator);
        uint256 claimId = pool.fileClaim(INVOICE_ID, COVERAGE_AMOUNT);

        vm.prank(admin);
        pool.approveClaim(claimId, COVERAGE_AMOUNT);

        // Process claim
        vm.prank(admin);
        pool.processClaim(claimId);

        InsurancePool.Claim memory claim = pool.getClaim(claimId);
        assertTrue(claim.status == InsurancePool.ClaimStatus.PAID);

        InsurancePool.Coverage memory coverage = pool.getCoverage(coverageId);
        assertTrue(coverage.status == InsurancePool.CoverageStatus.CLAIMED);
    }

    function test_ProcessClaim_PayoutsCorrectly() public {
        // Setup liquidity pool address
        address mockLiquidityPool = address(0x999);
        vm.prank(admin);
        pool.setLiquidityPoolAddress(mockLiquidityPool);

        // Setup, file, and approve claim
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        vm.prank(operator);
        pool.purchaseCoverage(INVOICE_ID, InsurancePool.CoverageTier.STANDARD, COVERAGE_AMOUNT);

        vm.prank(operator);
        uint256 claimId = pool.fileClaim(INVOICE_ID, COVERAGE_AMOUNT);

        vm.prank(admin);
        pool.approveClaim(claimId, COVERAGE_AMOUNT);

        uint256 balanceBefore = usdt.balanceOf(mockLiquidityPool);

        // Process claim
        vm.prank(admin);
        pool.processClaim(claimId);

        uint256 balanceAfter = usdt.balanceOf(mockLiquidityPool);
        assertEq(balanceAfter - balanceBefore, COVERAGE_AMOUNT);
    }

    function test_RejectClaim_Success() public {
        // Setup and file claim
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        vm.prank(operator);
        pool.purchaseCoverage(INVOICE_ID, InsurancePool.CoverageTier.STANDARD, COVERAGE_AMOUNT);

        vm.prank(operator);
        uint256 claimId = pool.fileClaim(INVOICE_ID, COVERAGE_AMOUNT);

        // Reject claim
        vm.prank(admin);
        pool.rejectClaim(claimId, "Fraudulent claim");

        InsurancePool.Claim memory claim = pool.getClaim(claimId);
        assertTrue(claim.status == InsurancePool.ClaimStatus.REJECTED);
        assertEq(claim.notes, "Fraudulent claim");
    }

    function test_ProcessClaimDirect_FullFlow() public {
        // Setup liquidity pool
        address mockLiquidityPool = address(0x999);
        vm.prank(admin);
        pool.setLiquidityPoolAddress(mockLiquidityPool);

        // Setup coverage
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        vm.prank(operator);
        pool.purchaseCoverage(INVOICE_ID, InsurancePool.CoverageTier.STANDARD, COVERAGE_AMOUNT);

        // Process claim directly
        uint256 balanceBefore = usdt.balanceOf(mockLiquidityPool);

        vm.prank(admin);
        pool.processClaimDirect(INVOICE_ID);

        uint256 balanceAfter = usdt.balanceOf(mockLiquidityPool);
        assertEq(balanceAfter - balanceBefore, COVERAGE_AMOUNT);
    }

    // ============================================
    // View Function Tests
    // ============================================

    function test_GetReserveRatio_Correct() public {
        // Stake
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        // No coverage yet - ratio should be max
        assertEq(pool.getReserveRatio(), type(uint256).max);

        // Purchase coverage
        vm.prank(operator);
        pool.purchaseCoverage(INVOICE_ID, InsurancePool.CoverageTier.STANDARD, COVERAGE_AMOUNT);

        // Reserve ratio = totalStaked / activeCoverage * 10000
        // = 100,000 / 50,000 * 10000 = 20000 (200%)
        assertEq(pool.getReserveRatio(), 20000);
    }

    function test_CanPurchaseCoverage_ChecksReserve() public {
        // Stake
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        // Can purchase $50k (reserve would be 200%)
        assertTrue(pool.canPurchaseCoverage(COVERAGE_AMOUNT));

        // Cannot purchase $80k (reserve would be 125% < 150%)
        assertFalse(pool.canPurchaseCoverage(80_000 * 1e6));
    }

    function test_IsCovered_ChecksCoverage() public {
        // Not covered initially
        assertFalse(pool.isCovered(INVOICE_ID));

        // Stake and purchase coverage
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();

        vm.prank(operator);
        pool.purchaseCoverage(INVOICE_ID, InsurancePool.CoverageTier.STANDARD, COVERAGE_AMOUNT);

        // Now covered
        assertTrue(pool.isCovered(INVOICE_ID));
    }

    function test_CalculatePremium_Correct() public view {
        // STANDARD tier: 1% annual, 60 days
        uint256 premium = pool.calculatePremium(
            InsurancePool.CoverageTier.STANDARD,
            COVERAGE_AMOUNT,
            60
        );

        // Expected: $50,000 * 1% * (60/365) = ~$82.19
        uint256 expected = (COVERAGE_AMOUNT * 100 * 60) / (10000 * 365);
        assertEq(premium, expected);
    }

    function test_GetMaxCoverage_Correct() public view {
        // STANDARD tier: 75% coverage
        uint256 invoiceValue = 100_000 * 1e6;
        uint256 maxCoverage = pool.getMaxCoverage(InsurancePool.CoverageTier.STANDARD, invoiceValue);

        assertEq(maxCoverage, 75_000 * 1e6);
    }

    // ============================================
    // Admin Tests
    // ============================================

    function test_SetMinReserveRatio_Success() public {
        vm.prank(admin);
        pool.setMinReserveRatio(12000); // 120%

        assertEq(pool.minReserveRatio(), 12000);
    }

    function test_SetMinStakeLockDays_Success() public {
        vm.prank(admin);
        pool.setMinStakeLockDays(60);

        assertEq(pool.minStakeLockDays(), 60);
    }

    function test_Pause_Success() public {
        vm.prank(admin);
        pool.pause();

        // Try to stake while paused
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);

        vm.expectRevert();
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();
    }

    function test_Unpause_Success() public {
        vm.prank(admin);
        pool.pause();

        vm.prank(admin);
        pool.unpause();

        // Should work now
        vm.startPrank(investor1);
        usdt.approve(address(pool), STAKE_AMOUNT);
        pool.stake(STAKE_AMOUNT);
        vm.stopPrank();
    }
}
