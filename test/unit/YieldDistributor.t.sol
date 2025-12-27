// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/core/YieldDistributor.sol";
import "../../src/core/LiquidityPool.sol";
import "../../src/core/InvoiceToken.sol";
import "../helpers/TestHelper.sol";
import "../mocks/MockUSDT.sol";

contract YieldDistributorTest is TestHelper {
    YieldDistributor public distributor;
    MockUSDT public usdt;
    LiquidityPool public pool;
    InvoiceToken public invoiceToken;

    bytes32 public constant SCHEDULE_MANAGER_ROLE = keccak256("SCHEDULE_MANAGER_ROLE");
    bytes32 public constant PAYMENT_PROCESSOR_ROLE = keccak256("PAYMENT_PROCESSOR_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant DEFAULT_MANAGER_ROLE = keccak256("DEFAULT_MANAGER_ROLE");
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("DISPUTE_RESOLVER_ROLE");

    // Events
    event ScheduleCreated(uint256 indexed invoiceId, uint256 faceValue, uint256 dueDate);
    event ScheduleCancelled(uint256 indexed invoiceId);
    event PaymentReceived(
        uint256 indexed invoiceId, uint256 amount, YieldDistributor.PaymentStatus status, bool wasLate
    );
    event PartialPaymentReceived(uint256 indexed invoiceId, uint256 amount, uint256 totalPaid);
    event Distributed(
        uint256 indexed distributionId, uint256 indexed invoiceId, uint256 principal, uint256 yield
    );
    event InvoiceOverdue(uint256 indexed invoiceId, uint256 daysOverdue);
    event InvoiceDefaulted(uint256 indexed invoiceId, uint256 outstandingAmount);
    event DisputeRaised(uint256 indexed invoiceId, string reason);
    event DisputeResolved(uint256 indexed invoiceId, YieldDistributor.DisputeResolution resolution);
    event LateFeeCollected(uint256 indexed invoiceId, uint256 amount);
    event ProtocolFeeCollected(uint256 amount);

    // Test amounts
    uint256 constant INVOICE_FACE_VALUE = 50_000e6; // $50,000
    uint256 constant ADVANCE_AMOUNT = 42_500e6; // 85%
    uint256 constant EXPECTED_YIELD = 7_500e6; // $7,500

    // Test hashes
    bytes32 public sellerHash1;
    bytes32 public buyerHash1;

    function setUp() public override {
        super.setUp();

        // Initialize hashes
        sellerHash1 = keccak256("seller1");
        buyerHash1 = keccak256("buyer1");

        // Deploy contracts
        usdt = new MockUSDT();

        vm.prank(admin);
        invoiceToken = new InvoiceToken();

        vm.prank(admin);
        pool = new LiquidityPool(address(usdt), admin);

        vm.prank(admin);
        distributor = new YieldDistributor(
            address(usdt),
            address(invoiceToken),
            address(pool),
            admin
        );

        // Grant roles
        vm.startPrank(admin);
        distributor.grantRole(SCHEDULE_MANAGER_ROLE, operator);
        distributor.grantRole(PAYMENT_PROCESSOR_ROLE, operator);
        distributor.grantRole(DISTRIBUTOR_ROLE, operator);
        distributor.grantRole(DEFAULT_MANAGER_ROLE, operator);

        // Setup invoice token
        invoiceToken.grantRole(invoiceToken.MINTER_ROLE(), operator);
        invoiceToken.grantRole(invoiceToken.UPDATER_ROLE(), address(distributor));

        // Setup liquidity pool
        pool.grantRole(pool.POOL_MANAGER_ROLE(), admin);
        pool.grantRole(pool.DEPLOYER_ROLE(), operator);
        pool.grantRole(pool.DEPLOYER_ROLE(), address(distributor)); // YieldDistributor needs this to call recordReturn/recordDefault
        pool.initializePool(
            LiquidityPool.RiskTier.TIER_A,
            1000, // 10% APY
            100e6,
            100_000e6,
            10_000_000e6
        );
        vm.stopPrank();

        // Mint USDT
        usdt.mint(buyer1, 1_000_000e6);
        usdt.mint(investor1, 1_000_000e6);
        usdt.mint(address(distributor), 1_000_000e6); // For tests
    }

    function _createTestInvoice() internal returns (uint256 invoiceId) {
        InvoiceToken.InvoiceData memory data = InvoiceToken.InvoiceData({
            invoiceId: 0, // Will be set by contract
            seller: seller1,
            buyerHash: buyerHash1,
            invoiceNumber: "INV-001",
            faceValue: INVOICE_FACE_VALUE,
            advanceAmount: 0,
            feeAmount: 0,
            issuedAt: block.timestamp,
            dueDate: block.timestamp + 60 days,
            fundedAt: 0,
            paidAt: 0,
            riskScore: 30,
            riskTier: InvoiceToken.RiskTier.TIER_A,
            documentHash: keccak256("doc-hash"),
            status: InvoiceToken.InvoiceStatus.PENDING_VERIFICATION
        });

        vm.prank(operator);
        invoiceId = invoiceToken.mint(seller1, data);
    }

    function _createDeployment() internal returns (uint256 deploymentId) {
        // Investor deposits
        vm.startPrank(investor1);
        usdt.approve(address(pool), 50_000e6);
        pool.deposit(LiquidityPool.RiskTier.TIER_A, 50_000e6);
        vm.stopPrank();

        // Deploy liquidity
        vm.prank(operator);
        deploymentId = pool.deployLiquidity(
            LiquidityPool.RiskTier.TIER_A,
            ADVANCE_AMOUNT,
            1, // invoiceId
            INVOICE_FACE_VALUE,
            block.timestamp + 60 days
        );
    }

    // ============================================
    // Constructor Tests
    // ============================================

    function test_Constructor_SetsContracts() public view {
        assertEq(address(distributor.stablecoin()), address(usdt));
        assertEq(address(distributor.invoiceToken()), address(invoiceToken));
        assertEq(address(distributor.liquidityPool()), address(pool));
    }

    function test_Constructor_GrantsRoles() public view {
        assertTrue(distributor.hasRole(distributor.DEFAULT_ADMIN_ROLE(), admin));
    }

    // ============================================
    // Payment Schedule Tests
    // ============================================

    function test_CreatePaymentSchedule_Success() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();
        uint256 dueDate = block.timestamp + 60 days;

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            dueDate
        );

        YieldDistributor.PaymentSchedule memory schedule = distributor.getPaymentSchedule(invoiceId);
        assertEq(schedule.invoiceId, invoiceId);
        assertEq(schedule.faceValue, INVOICE_FACE_VALUE);
        assertEq(schedule.advanceAmount, ADVANCE_AMOUNT);
        assertEq(schedule.dueDate, dueDate);
        assertEq(uint256(schedule.status), uint256(YieldDistributor.PaymentStatus.PENDING));
    }

    function test_CreatePaymentSchedule_EmitsEvent() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();
        uint256 dueDate = block.timestamp + 60 days;

        vm.prank(operator);
        vm.expectEmit(true, true, true, true);
        emit ScheduleCreated(invoiceId, INVOICE_FACE_VALUE, dueDate);

        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            dueDate
        );
    }

    function test_CreatePaymentSchedule_RevertWhen_AlreadyExists() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();
        uint256 dueDate = block.timestamp + 60 days;

        vm.startPrank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            dueDate
        );

        vm.expectRevert(YieldDistributor.ScheduleAlreadyExists.selector);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            dueDate
        );
        vm.stopPrank();
    }

    function test_CancelSchedule_Success() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();

        vm.startPrank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            block.timestamp + 60 days
        );

        distributor.cancelSchedule(invoiceId);
        vm.stopPrank();

        YieldDistributor.PaymentSchedule memory schedule = distributor.getPaymentSchedule(invoiceId);
        assertEq(uint256(schedule.status), uint256(YieldDistributor.PaymentStatus.DISPUTED));
    }

    // ============================================
    // Payment Processing Tests
    // ============================================

    function test_RecordPayment_OnTime() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            block.timestamp + 60 days
        );

        // Fast forward to before due date
        vm.warp(block.timestamp + 30 days);

        // Buyer pays
        vm.startPrank(buyer1);
        usdt.approve(address(distributor), INVOICE_FACE_VALUE);
        vm.stopPrank();

        vm.prank(operator);
        distributor.recordPayment(
            invoiceId,
            INVOICE_FACE_VALUE,
            buyer1,
            keccak256("TX-REF-001")
        );

        YieldDistributor.PaymentSchedule memory schedule = distributor.getPaymentSchedule(invoiceId);
        assertEq(schedule.paidAmount, INVOICE_FACE_VALUE);
        assertEq(uint256(schedule.status), uint256(YieldDistributor.PaymentStatus.PAID_ON_TIME));
    }

    function test_RecordPayment_Late_CalculatesFee() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();
        uint256 dueDate = block.timestamp + 60 days;

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            dueDate
        );

        // Fast forward past due date (10 days late)
        vm.warp(dueDate + 10 days);

        // Calculate expected late fee: $50,000 × 0.1% × 10 days = $500
        uint256 expectedLateFee = (INVOICE_FACE_VALUE * 10 * 10) / 10000;

        // Buyer pays
        vm.startPrank(buyer1);
        usdt.approve(address(distributor), INVOICE_FACE_VALUE);
        vm.stopPrank();

        vm.prank(operator);
        distributor.recordPayment(
            invoiceId,
            INVOICE_FACE_VALUE,
            buyer1,
            keccak256("TX-REF-002")
        );

        YieldDistributor.PaymentSchedule memory schedule = distributor.getPaymentSchedule(invoiceId);
        assertEq(uint256(schedule.status), uint256(YieldDistributor.PaymentStatus.PAID_LATE));
        assertEq(schedule.lateFee, expectedLateFee);
    }

    function test_RecordPayment_AutoDistributes() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            block.timestamp + 60 days
        );

        vm.startPrank(buyer1);
        usdt.approve(address(distributor), INVOICE_FACE_VALUE);
        vm.stopPrank();

        vm.prank(operator);
        distributor.recordPayment(
            invoiceId,
            INVOICE_FACE_VALUE,
            buyer1,
            keccak256("TX-REF-003")
        );

        // Should auto-distribute
        assertGt(distributor.getTotalDistributed(), 0);
    }

    function test_RecordPaymentDirect_Success() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            block.timestamp + 60 days
        );

        // Buyer pays directly
        vm.startPrank(buyer1);
        usdt.approve(address(distributor), INVOICE_FACE_VALUE);
        distributor.recordPaymentDirect(invoiceId, INVOICE_FACE_VALUE, keccak256("TX-REF-004"));
        vm.stopPrank();

        YieldDistributor.PaymentSchedule memory schedule = distributor.getPaymentSchedule(invoiceId);
        assertEq(schedule.paidAmount, INVOICE_FACE_VALUE);
    }

    function test_RecordPartialPayment_Success() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            block.timestamp + 60 days
        );

        uint256 partialAmount = 25_000e6;

        vm.startPrank(buyer1);
        usdt.approve(address(distributor), partialAmount);
        vm.stopPrank();

        vm.prank(operator);
        distributor.recordPartialPayment(invoiceId, partialAmount, buyer1);

        YieldDistributor.PaymentSchedule memory schedule = distributor.getPaymentSchedule(invoiceId);
        assertEq(schedule.paidAmount, partialAmount);
    }

    // ============================================
    // Distribution Tests
    // ============================================

    function test_Distribute_CorrectSplits() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            block.timestamp + 60 days
        );

        vm.startPrank(buyer1);
        usdt.approve(address(distributor), INVOICE_FACE_VALUE);
        vm.stopPrank();

        vm.prank(operator);
        distributor.recordPayment(
            invoiceId,
            INVOICE_FACE_VALUE,
            buyer1,
            keccak256("TX-REF-005")
        );

        // Check distribution
        (uint256 principal, uint256 yield, uint256 fee) = distributor.calculateExpectedDistribution(invoiceId);

        assertEq(principal, ADVANCE_AMOUNT);
        assertGt(yield, 0);
        assertGt(fee, 0);
    }

    // ============================================
    // Overdue & Default Tests
    // ============================================

    function test_CheckOverdue_UpdatesStatus() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();
        uint256 dueDate = block.timestamp + 60 days;

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            dueDate
        );

        // Fast forward past grace period
        vm.warp(dueDate + 10 days);

        distributor.checkOverdue(invoiceId);

        YieldDistributor.PaymentSchedule memory schedule = distributor.getPaymentSchedule(invoiceId);
        assertEq(uint256(schedule.status), uint256(YieldDistributor.PaymentStatus.OVERDUE));
    }

    function test_MarkAsDefaulted_Success() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            block.timestamp + 60 days
        );

        vm.prank(operator);
        distributor.markAsDefaulted(invoiceId);

        YieldDistributor.PaymentSchedule memory schedule = distributor.getPaymentSchedule(invoiceId);
        assertEq(uint256(schedule.status), uint256(YieldDistributor.PaymentStatus.DEFAULTED));
    }

    // ============================================
    // Dispute Tests
    // ============================================

    function test_RaiseDispute_Success() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            block.timestamp + 60 days
        );

        distributor.raiseDispute(invoiceId, "Quality issue");

        YieldDistributor.PaymentSchedule memory schedule = distributor.getPaymentSchedule(invoiceId);
        assertEq(uint256(schedule.status), uint256(YieldDistributor.PaymentStatus.DISPUTED));
    }

    // ============================================
    // View Function Tests
    // ============================================

    function test_GetDaysUntilDue_Correct() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();
        uint256 dueDate = block.timestamp + 60 days;

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            dueDate
        );

        int256 daysUntilDue = distributor.getDaysUntilDue(invoiceId);
        assertEq(daysUntilDue, 60);
    }

    function test_GetDaysOverdue_Correct() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();
        uint256 dueDate = block.timestamp + 60 days;

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            dueDate
        );

        vm.warp(dueDate + 10 days);

        uint256 daysOverdue = distributor.getDaysOverdue(invoiceId);
        assertEq(daysOverdue, 10);
    }

    function test_CalculateLateFee_Correct() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();
        uint256 dueDate = block.timestamp + 60 days;

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            dueDate
        );

        vm.warp(dueDate + 10 days);

        uint256 lateFee = distributor.calculateLateFee(invoiceId);
        // Expected: $50,000 × 0.1% × 10 = $500
        uint256 expected = (INVOICE_FACE_VALUE * 10 * 10) / 10000;
        assertEq(lateFee, expected);
    }

    // ============================================
    // Admin Function Tests
    // ============================================

    function test_SetGracePeriodDays_Success() public {
        vm.prank(admin);
        distributor.setGracePeriodDays(7);

        assertEq(distributor.gracePeriodDays(), 7);
    }

    function test_SetLateFeeRate_Success() public {
        vm.prank(admin);
        distributor.setLateFeeRate(20); // 0.2% per day

        assertEq(distributor.lateFeeRateBps(), 20);
    }

    function test_WithdrawProtocolFees_Success() public {
        uint256 invoiceId = _createTestInvoice();
        uint256 deploymentId = _createDeployment();

        vm.prank(operator);
        distributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            INVOICE_FACE_VALUE,
            ADVANCE_AMOUNT,
            block.timestamp + 60 days
        );

        vm.startPrank(buyer1);
        usdt.approve(address(distributor), INVOICE_FACE_VALUE);
        vm.stopPrank();

        vm.prank(operator);
        distributor.recordPayment(
            invoiceId,
            INVOICE_FACE_VALUE,
            buyer1,
            keccak256("TX-REF-006")
        );

        uint256 fees = distributor.getProtocolFeesCollected();
        if (fees > 0) {
            uint256 balanceBefore = usdt.balanceOf(admin);

            vm.prank(admin);
            distributor.withdrawProtocolFees(admin);

            uint256 balanceAfter = usdt.balanceOf(admin);
            assertEq(balanceAfter - balanceBefore, fees);
        }
    }
}
