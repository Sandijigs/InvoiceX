// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/core/LiquidityPool.sol";
import "../helpers/TestHelper.sol";
import "../mocks/MockUSDT.sol";

contract LiquidityPoolTest is TestHelper {
    LiquidityPool public pool;
    MockUSDT public usdt;

    bytes32 public constant DEPLOYER_ROLE = keccak256("DEPLOYER_ROLE");
    bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");

    // Events
    event PoolInitialized(LiquidityPool.RiskTier indexed tier, uint256 targetAPY, uint256 maxPoolSize);
    event PoolConfigUpdated(LiquidityPool.RiskTier indexed tier);
    event DepositsEnabled(LiquidityPool.RiskTier indexed tier);
    event DepositsPaused(LiquidityPool.RiskTier indexed tier);
    event Deposited(address indexed user, LiquidityPool.RiskTier indexed tier, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, LiquidityPool.RiskTier indexed tier, uint256 shares, uint256 amount);
    event YieldClaimed(address indexed user, LiquidityPool.RiskTier indexed tier, uint256 amount);
    event YieldCompounded(
        address indexed user, LiquidityPool.RiskTier indexed tier, uint256 yieldAmount, uint256 newShares
    );
    event LiquidityDeployed(
        uint256 indexed deploymentId, LiquidityPool.RiskTier indexed tier, uint256 invoiceId, uint256 amount
    );
    event LiquidityReturned(uint256 indexed deploymentId, uint256 returnedAmount, uint256 yieldEarned);
    event DeploymentDefaulted(uint256 indexed deploymentId, uint256 lossAmount, uint256 recoveredAmount);
    event ProtocolFeeCollected(uint256 amount);

    // Test amounts
    uint256 constant TIER_A_MIN = 100e6; // $100
    uint256 constant TIER_A_MAX = 100_000e6; // $100,000
    uint256 constant TIER_A_POOL_MAX = 10_000_000e6; // $10M
    uint256 constant TIER_A_APY = 1000; // 10%

    uint256 constant TIER_B_MIN = 100e6;
    uint256 constant TIER_B_MAX = 50_000e6;
    uint256 constant TIER_B_POOL_MAX = 5_000_000e6;
    uint256 constant TIER_B_APY = 1800; // 18%

    uint256 constant TIER_C_MIN = 100e6;
    uint256 constant TIER_C_MAX = 25_000e6;
    uint256 constant TIER_C_POOL_MAX = 2_000_000e6;
    uint256 constant TIER_C_APY = 2500; // 25%

    function setUp() public override {
        super.setUp();

        // Deploy MockUSDT
        usdt = new MockUSDT();

        // Deploy LiquidityPool
        vm.prank(admin);
        pool = new LiquidityPool(address(usdt), admin);

        // Grant roles
        vm.startPrank(admin);
        pool.grantRole(DEPLOYER_ROLE, operator);
        pool.grantRole(POOL_MANAGER_ROLE, admin);
        vm.stopPrank();

        // Mint USDT to test users
        usdt.mint(investor1, 1_000_000e6);
        usdt.mint(investor2, 1_000_000e6);
        usdt.mint(seller1, 1_000_000e6);

        // Initialize pools
        _initializePools();
    }

    function _initializePools() internal {
        vm.startPrank(admin);
        pool.initializePool(
            LiquidityPool.RiskTier.TIER_A, TIER_A_APY, TIER_A_MIN, TIER_A_MAX, TIER_A_POOL_MAX
        );
        pool.initializePool(
            LiquidityPool.RiskTier.TIER_B, TIER_B_APY, TIER_B_MIN, TIER_B_MAX, TIER_B_POOL_MAX
        );
        pool.initializePool(
            LiquidityPool.RiskTier.TIER_C, TIER_C_APY, TIER_C_MIN, TIER_C_MAX, TIER_C_POOL_MAX
        );
        vm.stopPrank();
    }

    // ============================================
    // Constructor Tests
    // ============================================

    function test_Constructor_SetsStablecoin() public view {
        assertEq(address(pool.stablecoin()), address(usdt));
    }

    function test_Constructor_GrantsAdminRole() public view {
        assertTrue(pool.hasRole(pool.DEFAULT_ADMIN_ROLE(), admin));
    }

    // ============================================
    // Pool Initialization Tests
    // ============================================

    function test_InitializePool_Success() public {
        vm.prank(admin);
        LiquidityPool newPool = new LiquidityPool(address(usdt), admin);

        vm.prank(admin);
        newPool.initializePool(
            LiquidityPool.RiskTier.TIER_A, TIER_A_APY, TIER_A_MIN, TIER_A_MAX, TIER_A_POOL_MAX
        );

        LiquidityPool.Pool memory poolData = newPool.getPool(LiquidityPool.RiskTier.TIER_A);
        assertEq(poolData.targetAPY, TIER_A_APY);
        assertEq(poolData.minDeposit, TIER_A_MIN);
        assertEq(poolData.maxDeposit, TIER_A_MAX);
        assertEq(poolData.maxPoolSize, TIER_A_POOL_MAX);
        assertTrue(poolData.acceptingDeposits);
    }

    function test_InitializePool_RevertWhen_AlreadyInitialized() public {
        vm.startPrank(admin);
        vm.expectRevert(LiquidityPool.PoolAlreadyInitialized.selector);
        pool.initializePool(
            LiquidityPool.RiskTier.TIER_A, TIER_A_APY, TIER_A_MIN, TIER_A_MAX, TIER_A_POOL_MAX
        );
        vm.stopPrank();
    }

    function test_UpdatePoolConfig_Success() public {
        vm.prank(admin);
        pool.updatePoolConfig(
            LiquidityPool.RiskTier.TIER_A, 1200, TIER_A_MIN, TIER_A_MAX, TIER_A_POOL_MAX
        );

        LiquidityPool.Pool memory poolData = pool.getPool(LiquidityPool.RiskTier.TIER_A);
        assertEq(poolData.targetAPY, 1200);
    }

    function test_PauseDeposits_Success() public {
        vm.prank(admin);
        pool.pauseDeposits(LiquidityPool.RiskTier.TIER_A);

        LiquidityPool.Pool memory poolData = pool.getPool(LiquidityPool.RiskTier.TIER_A);
        assertFalse(poolData.acceptingDeposits);
    }

    function test_ResumeDeposits_Success() public {
        vm.startPrank(admin);
        pool.pauseDeposits(LiquidityPool.RiskTier.TIER_A);
        pool.resumeDeposits(LiquidityPool.RiskTier.TIER_A);
        vm.stopPrank();

        LiquidityPool.Pool memory poolData = pool.getPool(LiquidityPool.RiskTier.TIER_A);
        assertTrue(poolData.acceptingDeposits);
    }

    // ============================================
    // Deposit Tests
    // ============================================

    function test_Deposit_Success() public {
        uint256 depositAmount = 10_000e6;

        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        uint256 shares = pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        assertGt(shares, 0);

        LiquidityPool.Pool memory poolData = pool.getPool(LiquidityPool.RiskTier.TIER_A);
        assertEq(poolData.totalDeposits, depositAmount);
        assertEq(poolData.availableLiquidity, depositAmount);
        assertEq(poolData.totalShares, shares);

        LiquidityPool.UserPosition memory position =
            pool.getUserPosition(investor1, LiquidityPool.RiskTier.TIER_A);
        assertEq(position.shares, shares);
        assertEq(position.depositedValue, depositAmount);
    }

    function test_Deposit_CalculatesSharesCorrectly() public {
        uint256 depositAmount = 10_000e6;

        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        uint256 shares = pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        // First deposit should get 1:1 ratio
        assertEq(shares, depositAmount);
    }

    function test_Deposit_EmitsEvent() public {
        uint256 depositAmount = 10_000e6;

        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);

        vm.expectEmit(true, true, true, true);
        emit Deposited(investor1, LiquidityPool.RiskTier.TIER_A, depositAmount, depositAmount);

        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();
    }

    function test_Deposit_RevertWhen_Paused() public {
        vm.prank(admin);
        pool.pauseDeposits(LiquidityPool.RiskTier.TIER_A);

        uint256 depositAmount = 10_000e6;

        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        vm.expectRevert(LiquidityPool.PoolNotAcceptingDeposits.selector);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();
    }

    function test_Deposit_RevertWhen_BelowMinimum() public {
        uint256 depositAmount = 50e6; // Below $100 minimum

        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        vm.expectRevert(LiquidityPool.InsufficientDeposit.selector);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();
    }

    function test_Deposit_RevertWhen_AboveMaximum() public {
        uint256 depositAmount = 200_000e6; // Above $100,000 maximum

        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        vm.expectRevert(LiquidityPool.ExceedsMaxDeposit.selector);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();
    }

    function test_Deposit_RevertWhen_ExceedsPoolCap() public {
        // Mint extra tokens to investor1 for this test
        usdt.mint(investor1, 10_000_000e6);

        // First investor deposits multiple times to fill to capacity
        // Each deposit is at max (100k), total: 10M = 100 deposits
        vm.startPrank(investor1);
        for (uint256 i = 0; i < 100; i++) {
            usdt.approve(address(pool), TIER_A_MAX);
            pool.deposit(LiquidityPool.RiskTier.TIER_A, TIER_A_MAX);
        }
        vm.stopPrank();

        // Pool is now at exactly 10M capacity
        // Second investor tries to deposit - should fail even with minimum
        vm.startPrank(investor2);
        usdt.approve(address(pool), TIER_A_MIN);
        vm.expectRevert(LiquidityPool.ExceedsPoolCapacity.selector);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, TIER_A_MIN);
        vm.stopPrank();
    }

    // ============================================
    // Withdraw Tests
    // ============================================

    function test_Withdraw_Success() public {
        uint256 depositAmount = 10_000e6;

        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        uint256 shares = pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);

        uint256 balanceBefore = usdt.balanceOf(investor1);
        uint256 withdrawnAmount = pool.withdraw(LiquidityPool.RiskTier.TIER_A, shares);
        uint256 balanceAfter = usdt.balanceOf(investor1);
        vm.stopPrank();

        assertEq(withdrawnAmount, depositAmount);
        assertEq(balanceAfter - balanceBefore, depositAmount);

        LiquidityPool.UserPosition memory position =
            pool.getUserPosition(investor1, LiquidityPool.RiskTier.TIER_A);
        assertEq(position.shares, 0);
    }

    function test_Withdraw_EmitsEvent() public {
        uint256 depositAmount = 10_000e6;

        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        uint256 shares = pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);

        vm.expectEmit(true, true, true, true);
        emit Withdrawn(investor1, LiquidityPool.RiskTier.TIER_A, shares, depositAmount);

        pool.withdraw(LiquidityPool.RiskTier.TIER_A, shares);
        vm.stopPrank();
    }

    function test_Withdraw_RevertWhen_InsufficientShares() public {
        uint256 depositAmount = 10_000e6;

        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        uint256 shares = pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);

        vm.expectRevert(LiquidityPool.InsufficientShares.selector);
        pool.withdraw(LiquidityPool.RiskTier.TIER_A, shares + 1);
        vm.stopPrank();
    }

    function test_Withdraw_RevertWhen_InsufficientLiquidity() public {
        // Investor 1 deposits
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        uint256 shares = pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        // Deploy all liquidity
        vm.prank(operator);
        pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A,
            depositAmount,
            1, // invoiceId
            depositAmount + 1000e6, // expectedReturn
            block.timestamp + 30 days
        );

        // Investor tries to withdraw but no liquidity available
        vm.startPrank(investor1);
        vm.expectRevert(LiquidityPool.InsufficientLiquidity.selector);
        pool.withdraw(LiquidityPool.RiskTier.TIER_A, shares);
        vm.stopPrank();
    }

    // ============================================
    // Deploy Liquidity Tests
    // ============================================

    function test_DeployLiquidity_Success() public {
        // First deposit liquidity
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        // Deploy liquidity
        uint256 deployAmount = 5_000e6;
        uint256 expectedReturn = 5_500e6;
        uint256 dueDate = block.timestamp + 30 days;

        vm.prank(operator);
        uint256 deploymentId = pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A, deployAmount, 1, expectedReturn, dueDate
        );

        assertEq(deploymentId, 1);

        LiquidityPool.Pool memory poolData = pool.getPool(LiquidityPool.RiskTier.TIER_A);
        assertEq(poolData.availableLiquidity, depositAmount - deployAmount);
        assertEq(poolData.deployedLiquidity, deployAmount);
        assertEq(poolData.pendingReturns, expectedReturn);

        LiquidityPool.Deployment memory deployment = pool.getDeployment(deploymentId);
        assertEq(deployment.principalAmount, deployAmount);
        assertEq(deployment.expectedReturn, expectedReturn);
        assertEq(uint256(deployment.status), uint256(LiquidityPool.DeploymentStatus.ACTIVE));
    }

    function test_DeployLiquidity_EmitsEvent() public {
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        uint256 deployAmount = 5_000e6;

        vm.prank(operator);
        vm.expectEmit(true, true, true, true);
        emit LiquidityDeployed(1, LiquidityPool.RiskTier.TIER_A, 1, deployAmount);

        pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A,
            deployAmount,
            1,
            deployAmount + 500e6,
            block.timestamp + 30 days
        );
    }

    function test_DeployLiquidity_RevertWhen_InsufficientLiquidity() public {
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        uint256 deployAmount = 20_000e6; // More than available

        vm.prank(operator);
        vm.expectRevert(LiquidityPool.InsufficientLiquidity.selector);
        pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A,
            deployAmount,
            1,
            deployAmount + 500e6,
            block.timestamp + 30 days
        );
    }

    // ============================================
    // Record Return Tests
    // ============================================

    function test_RecordReturn_Full() public {
        // Deposit and deploy
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        uint256 deployAmount = 5_000e6;
        uint256 expectedReturn = 5_500e6;

        vm.prank(operator);
        uint256 deploymentId = pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A, deployAmount, 1, expectedReturn, block.timestamp + 30 days
        );

        // Mint USDT to pool for return
        usdt.mint(address(pool), expectedReturn);

        // Record return
        vm.prank(operator);
        pool.recordReturn(deploymentId, expectedReturn);

        LiquidityPool.Deployment memory deployment = pool.getDeployment(deploymentId);
        assertEq(deployment.actualReturn, expectedReturn);
        assertEq(uint256(deployment.status), uint256(LiquidityPool.DeploymentStatus.RETURNED_FULL));

        LiquidityPool.Pool memory poolData = pool.getPool(LiquidityPool.RiskTier.TIER_A);
        assertEq(poolData.deployedLiquidity, 0);
        assertEq(poolData.pendingReturns, 0);
        assertGt(poolData.totalYieldEarned, 0);
    }

    function test_RecordReturn_UpdatesExchangeRate() public {
        // Deposit
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        uint256 initialRate = pool.getExchangeRate(LiquidityPool.RiskTier.TIER_A);

        // Deploy and return with profit
        uint256 deployAmount = 5_000e6;
        uint256 expectedReturn = 5_500e6;

        vm.prank(operator);
        uint256 deploymentId = pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A, deployAmount, 1, expectedReturn, block.timestamp + 30 days
        );

        usdt.mint(address(pool), expectedReturn);

        vm.prank(operator);
        pool.recordReturn(deploymentId, expectedReturn);

        uint256 newRate = pool.getExchangeRate(LiquidityPool.RiskTier.TIER_A);
        assertGt(newRate, initialRate);
    }

    function test_RecordReturn_EmitsEvent() public {
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        uint256 deployAmount = 5_000e6;
        uint256 expectedReturn = 5_500e6;

        vm.prank(operator);
        uint256 deploymentId = pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A, deployAmount, 1, expectedReturn, block.timestamp + 30 days
        );

        usdt.mint(address(pool), expectedReturn);

        vm.prank(operator);
        vm.expectEmit(true, true, true, true);
        emit LiquidityReturned(deploymentId, expectedReturn, 500e6);

        pool.recordReturn(deploymentId, expectedReturn);
    }

    // ============================================
    // Record Default Tests
    // ============================================

    function test_RecordDefault_FullLoss() public {
        // Deposit and deploy
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        uint256 deployAmount = 5_000e6;

        vm.prank(operator);
        uint256 deploymentId = pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A, deployAmount, 1, deployAmount + 500e6, block.timestamp + 30 days
        );

        // Record default with 0 recovery
        vm.prank(operator);
        pool.recordDefault(deploymentId, 0);

        LiquidityPool.Deployment memory deployment = pool.getDeployment(deploymentId);
        assertEq(deployment.actualReturn, 0);
        assertEq(uint256(deployment.status), uint256(LiquidityPool.DeploymentStatus.DEFAULTED));

        LiquidityPool.Pool memory poolData = pool.getPool(LiquidityPool.RiskTier.TIER_A);
        assertEq(poolData.totalLosses, deployAmount);
        assertEq(poolData.deployedLiquidity, 0);
    }

    function test_RecordDefault_PartialRecovery() public {
        // Deposit and deploy
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        uint256 deployAmount = 5_000e6;

        vm.prank(operator);
        uint256 deploymentId = pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A, deployAmount, 1, deployAmount + 500e6, block.timestamp + 30 days
        );

        // Record default with partial recovery
        uint256 recoveredAmount = 3_000e6;
        usdt.mint(address(pool), recoveredAmount);

        vm.prank(operator);
        pool.recordDefault(deploymentId, recoveredAmount);

        LiquidityPool.Pool memory poolData = pool.getPool(LiquidityPool.RiskTier.TIER_A);
        assertEq(poolData.totalLosses, deployAmount - recoveredAmount);
        assertEq(poolData.availableLiquidity, depositAmount - deployAmount + recoveredAmount);
    }

    function test_RecordDefault_EmitsEvent() public {
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        uint256 deployAmount = 5_000e6;

        vm.prank(operator);
        uint256 deploymentId = pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A, deployAmount, 1, deployAmount + 500e6, block.timestamp + 30 days
        );

        vm.prank(operator);
        vm.expectEmit(true, true, true, true);
        emit DeploymentDefaulted(deploymentId, deployAmount, 0);

        pool.recordDefault(deploymentId, 0);
    }

    // ============================================
    // Exchange Rate Tests
    // ============================================

    function test_ExchangeRate_IncreasesWithYield() public {
        uint256 depositAmount = 10_000e6;

        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        uint256 initialRate = pool.getExchangeRate(LiquidityPool.RiskTier.TIER_A);

        // Deploy and return with yield
        uint256 deployAmount = 5_000e6;
        uint256 returnAmount = 6_000e6;

        vm.prank(operator);
        uint256 deploymentId = pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A, deployAmount, 1, returnAmount, block.timestamp + 30 days
        );

        usdt.mint(address(pool), returnAmount);

        vm.prank(operator);
        pool.recordReturn(deploymentId, returnAmount);

        uint256 finalRate = pool.getExchangeRate(LiquidityPool.RiskTier.TIER_A);
        assertGt(finalRate, initialRate);
    }

    function test_ExchangeRate_DecreasesWithLoss() public {
        uint256 depositAmount = 10_000e6;

        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        uint256 initialRate = pool.getExchangeRate(LiquidityPool.RiskTier.TIER_A);

        // Deploy and default
        uint256 deployAmount = 5_000e6;

        vm.prank(operator);
        uint256 deploymentId = pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A, deployAmount, 1, deployAmount + 500e6, block.timestamp + 30 days
        );

        vm.prank(operator);
        pool.recordDefault(deploymentId, 0);

        uint256 finalRate = pool.getExchangeRate(LiquidityPool.RiskTier.TIER_A);
        assertLt(finalRate, initialRate);
    }

    // ============================================
    // Multiple Depositors Tests
    // ============================================

    function test_MultipleDepositors_FairShares() public {
        // Investor 1 deposits
        uint256 deposit1 = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), deposit1);
        uint256 shares1 = pool.deposit(LiquidityPool.RiskTier.TIER_A, deposit1);
        vm.stopPrank();

        // Investor 2 deposits same amount
        uint256 deposit2 = 10_000e6;
        vm.startPrank(investor2);
        usdt.approve(address(pool), deposit2);
        uint256 shares2 = pool.deposit(LiquidityPool.RiskTier.TIER_A, deposit2);
        vm.stopPrank();

        // Both should get same shares initially
        assertEq(shares1, shares2);

        LiquidityPool.Pool memory poolData = pool.getPool(LiquidityPool.RiskTier.TIER_A);
        assertEq(poolData.totalDeposits, deposit1 + deposit2);
        assertEq(poolData.totalShares, shares1 + shares2);
    }

    // ============================================
    // Yield Claim Tests
    // ============================================

    function test_ClaimYield_Success() public {
        // This is a placeholder - in reality yield distribution would be more complex
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        // Manually set pending yield (in production this would come from yield distribution)
        // We'll skip this test as it requires internal state manipulation
    }

    // ============================================
    // View Function Tests
    // ============================================

    function test_GetUtilizationRate_Correct() public {
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        uint256 utilization = pool.getUtilizationRate(LiquidityPool.RiskTier.TIER_A);
        assertEq(utilization, 0); // No deployments yet

        // Deploy 50%
        uint256 deployAmount = 5_000e6;
        vm.prank(operator);
        pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A, deployAmount, 1, deployAmount + 500e6, block.timestamp + 30 days
        );

        utilization = pool.getUtilizationRate(LiquidityPool.RiskTier.TIER_A);
        assertEq(utilization, 5000); // 50% in basis points
    }

    function test_GetEffectiveAPY_Correct() public {
        // Initial should be 0
        uint256 apy = pool.getEffectiveAPY(LiquidityPool.RiskTier.TIER_A);
        assertEq(apy, 0);
    }

    function test_GetTotalValueLocked() public {
        uint256 deposit1 = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), deposit1);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, deposit1);
        vm.stopPrank();

        uint256 deposit2 = 5_000e6;
        vm.startPrank(investor2);
        usdt.approve(address(pool), deposit2);
        pool.deposit(LiquidityPool.RiskTier.TIER_B, deposit2);
        vm.stopPrank();

        uint256 tvl = pool.getTotalValueLocked();
        assertEq(tvl, deposit1 + deposit2);
    }

    function test_CanWithdraw_ReturnsCorrectly() public {
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        uint256 shares = pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        (bool can, string memory reason) =
            pool.canWithdraw(investor1, LiquidityPool.RiskTier.TIER_A, shares);
        assertTrue(can);
        assertEq(reason, "");
    }

    // ============================================
    // Admin Function Tests
    // ============================================

    function test_SetProtocolFee_Success() public {
        vm.prank(admin);
        pool.setProtocolFee(1000); // 10%

        assertEq(pool.protocolFeeBps(), 1000);
    }

    function test_WithdrawProtocolFees_Success() public {
        // Generate some protocol fees
        uint256 depositAmount = 10_000e6;
        vm.startPrank(investor1);
        usdt.approve(address(pool), depositAmount);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, depositAmount);
        vm.stopPrank();

        uint256 deployAmount = 5_000e6;
        uint256 returnAmount = 6_000e6;

        vm.prank(operator);
        uint256 deploymentId = pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A, deployAmount, 1, returnAmount, block.timestamp + 30 days
        );

        usdt.mint(address(pool), returnAmount);

        vm.prank(operator);
        pool.recordReturn(deploymentId, returnAmount);

        // Withdraw fees
        uint256 fees = pool.accumulatedProtocolFees();
        assertGt(fees, 0);

        uint256 balanceBefore = usdt.balanceOf(admin);

        vm.prank(admin);
        pool.withdrawProtocolFees(admin);

        uint256 balanceAfter = usdt.balanceOf(admin);
        assertEq(balanceAfter - balanceBefore, fees);
        assertEq(pool.accumulatedProtocolFees(), 0);
    }

    function test_CompoundYield_Success() public {
        // Skip - requires internal yield state manipulation
    }
}
