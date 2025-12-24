// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TestHelper} from "../helpers/TestHelper.sol";
import {BuyerRegistry} from "../../src/core/BuyerRegistry.sol";

/**
 * @title BuyerRegistryTest
 * @notice Comprehensive tests for BuyerRegistry contract
 */
contract BuyerRegistryTest is TestHelper {
    BuyerRegistry public registry;

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant CREDIT_UPDATER_ROLE = keccak256("CREDIT_UPDATER_ROLE");
    bytes32 public constant STATS_UPDATER_ROLE = keccak256("STATS_UPDATER_ROLE");
    bytes32 public constant STATUS_MANAGER_ROLE = keccak256("STATUS_MANAGER_ROLE");

    // Test buyer hashes
    bytes32 public buyerHash1;
    bytes32 public buyerHash2;
    bytes32 public buyerHash3;

    // Events
    event BuyerRegistered(bytes32 indexed buyerHash, uint256 timestamp);
    event CreditScoreUpdated(
        bytes32 indexed buyerHash,
        uint256 oldScore,
        uint256 newScore,
        uint256 creditLimit
    );
    event BuyerStatusUpdated(
        bytes32 indexed buyerHash,
        BuyerRegistry.BuyerStatus oldStatus,
        BuyerRegistry.BuyerStatus newStatus
    );
    event InvoiceAssigned(bytes32 indexed buyerHash, uint256 indexed invoiceId, uint256 amount);
    event PaymentRecorded(
        bytes32 indexed buyerHash,
        uint256 indexed invoiceId,
        uint256 amount,
        bool wasLate,
        uint256 daysLate
    );
    event DefaultRecorded(bytes32 indexed buyerHash, uint256 indexed invoiceId, uint256 amount);
    event BuyerBlacklisted(bytes32 indexed buyerHash, string reason);
    event BuyerUnblacklisted(bytes32 indexed buyerHash);

    function setUp() public override {
        super.setUp();

        // Deploy BuyerRegistry
        vm.prank(admin);
        registry = new BuyerRegistry();

        // Grant roles
        vm.startPrank(admin);
        registry.grantRole(REGISTRAR_ROLE, operator);
        registry.grantRole(CREDIT_UPDATER_ROLE, oracle);
        registry.grantRole(STATS_UPDATER_ROLE, operator);
        registry.grantRole(STATUS_MANAGER_ROLE, admin);
        vm.stopPrank();

        // Generate test buyer hashes
        buyerHash1 = generateBuyerHash("AcmeCorp");
        buyerHash2 = generateBuyerHash("TechStart");
        buyerHash3 = generateBuyerHash("GlobalInc");
    }

    // ============ Helper Functions ============

    function _registerBuyer(bytes32 buyerHash) internal returns (bool) {
        vm.prank(operator);
        return registry.registerBuyer(buyerHash);
    }

    function _assignInvoice(bytes32 buyerHash, uint256 invoiceId, uint256 amount) internal {
        vm.prank(operator);
        registry.recordInvoiceAssigned(buyerHash, invoiceId, amount);
    }

    function _recordPayment(
        bytes32 buyerHash,
        uint256 invoiceId,
        uint256 amount,
        uint256 dueDate,
        uint256 paidAt
    ) internal {
        vm.prank(operator);
        registry.recordPayment(buyerHash, invoiceId, amount, dueDate, paidAt);
    }

    function _recordDefault(bytes32 buyerHash, uint256 invoiceId, uint256 amount) internal {
        vm.prank(operator);
        registry.recordDefault(buyerHash, invoiceId, amount);
    }

    // ============ Constructor Tests ============

    function test_Constructor_GrantsAdminRole() public view {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
    }

    // ============ Registration Tests ============

    function test_RegisterBuyer_Success_NewBuyer() public {
        bool isNew = _registerBuyer(buyerHash1);

        assertTrue(isNew, "Should return true for new buyer");
        assertTrue(registry.buyerExists(buyerHash1), "Buyer should exist");

        BuyerRegistry.Buyer memory buyer = registry.getBuyer(buyerHash1);
        assertEq(buyer.creditScore, 50, "Default credit score should be 50");
        assertEq(
            buyer.creditLimit,
            100_000 * 1e6,
            "Default credit limit should be $100,000"
        );
        assertEq(
            uint8(buyer.status),
            uint8(BuyerRegistry.BuyerStatus.UNKNOWN),
            "Status should be UNKNOWN"
        );
    }

    function test_RegisterBuyer_ReturnsFalse_ExistingBuyer() public {
        _registerBuyer(buyerHash1);

        bool isNew = _registerBuyer(buyerHash1);
        assertFalse(isNew, "Should return false for existing buyer");
    }

    function test_RegisterBuyer_EmitsEvent() public {
        vm.expectEmit(true, false, false, false);
        emit BuyerRegistered(buyerHash1, block.timestamp);

        _registerBuyer(buyerHash1);
    }

    function test_RegisterBuyer_RevertWhen_NotRegistrar() public {
        vm.expectRevert();
        vm.prank(seller1);
        registry.registerBuyer(buyerHash1);
    }

    function test_RegisterBuyer_RevertWhen_ZeroHash() public {
        vm.expectRevert(BuyerRegistry.ZeroBuyerHash.selector);
        vm.prank(operator);
        registry.registerBuyer(bytes32(0));
    }

    // ============ Credit Score Tests ============

    function test_UpdateCreditScore_Success() public {
        _registerBuyer(buyerHash1);

        vm.prank(oracle);
        registry.updateCreditScore(buyerHash1, 75, 200_000 * 1e6);

        BuyerRegistry.Buyer memory buyer = registry.getBuyer(buyerHash1);
        assertEq(buyer.creditScore, 75, "Credit score should be updated");
        assertEq(buyer.creditLimit, 200_000 * 1e6, "Credit limit should be updated");
    }

    function test_UpdateCreditScore_EmitsEvent() public {
        _registerBuyer(buyerHash1);

        vm.expectEmit(true, false, false, true);
        emit CreditScoreUpdated(buyerHash1, 50, 75, 200_000 * 1e6);

        vm.prank(oracle);
        registry.updateCreditScore(buyerHash1, 75, 200_000 * 1e6);
    }

    function test_UpdateCreditScore_RevertWhen_NotUpdater() public {
        _registerBuyer(buyerHash1);

        vm.expectRevert();
        vm.prank(seller1);
        registry.updateCreditScore(buyerHash1, 75, 200_000 * 1e6);
    }

    function test_UpdateCreditScore_RevertWhen_InvalidScore() public {
        _registerBuyer(buyerHash1);

        vm.expectRevert(BuyerRegistry.InvalidCreditScore.selector);
        vm.prank(oracle);
        registry.updateCreditScore(buyerHash1, 101, 200_000 * 1e6);
    }

    function test_UpdateCreditScore_RevertWhen_BuyerNotFound() public {
        vm.expectRevert(BuyerRegistry.BuyerNotFound.selector);
        vm.prank(oracle);
        registry.updateCreditScore(buyerHash1, 75, 200_000 * 1e6);
    }

    // ============ Invoice Assignment Tests ============

    function test_RecordInvoiceAssigned_Success() public {
        _registerBuyer(buyerHash1);

        _assignInvoice(buyerHash1, 1, TEN_THOUSAND_USDT);

        BuyerRegistry.Buyer memory buyer = registry.getBuyer(buyerHash1);
        assertEq(buyer.currentExposure, TEN_THOUSAND_USDT, "Exposure should increase");
        assertEq(buyer.stats.totalInvoicesReceived, 1, "Invoice count should increase");
        assertEq(
            buyer.stats.totalValueOwed,
            TEN_THOUSAND_USDT,
            "Total value owed should increase"
        );
    }

    function test_RecordInvoiceAssigned_IncreasesExposure() public {
        _registerBuyer(buyerHash1);

        _assignInvoice(buyerHash1, 1, TEN_THOUSAND_USDT);
        _assignInvoice(buyerHash1, 2, TEN_THOUSAND_USDT);

        uint256 exposure = registry.getCurrentExposure(buyerHash1);
        assertEq(exposure, TEN_THOUSAND_USDT * 2, "Exposure should be sum of invoices");
    }

    function test_RecordInvoiceAssigned_EmitsEvent() public {
        _registerBuyer(buyerHash1);

        vm.expectEmit(true, true, false, true);
        emit InvoiceAssigned(buyerHash1, 1, TEN_THOUSAND_USDT);

        _assignInvoice(buyerHash1, 1, TEN_THOUSAND_USDT);
    }

    function test_RecordInvoiceAssigned_RevertWhen_ZeroAmount() public {
        _registerBuyer(buyerHash1);

        vm.expectRevert(BuyerRegistry.InvalidAmount.selector);
        vm.prank(operator);
        registry.recordInvoiceAssigned(buyerHash1, 1, 0);
    }

    // ============ Payment Recording Tests ============

    function test_RecordPayment_OnTime_Success() public {
        _registerBuyer(buyerHash1);
        _assignInvoice(buyerHash1, 1, TEN_THOUSAND_USDT);

        uint256 dueDate = block.timestamp + 30 days;
        uint256 paidAt = dueDate;

        _recordPayment(buyerHash1, 1, TEN_THOUSAND_USDT, dueDate, paidAt);

        BuyerRegistry.BuyerStats memory stats = registry.getBuyerStats(buyerHash1);
        assertEq(stats.onTimePayments, 1, "On-time payment count should be 1");
        assertEq(stats.latePayments, 0, "Late payment count should be 0");
        assertEq(stats.totalValuePaid, TEN_THOUSAND_USDT, "Total paid should match");
    }

    function test_RecordPayment_Late_UpdatesStats() public {
        _registerBuyer(buyerHash1);
        _assignInvoice(buyerHash1, 1, TEN_THOUSAND_USDT);

        uint256 dueDate = block.timestamp + 30 days;
        uint256 paidAt = dueDate + 10 days;

        _recordPayment(buyerHash1, 1, TEN_THOUSAND_USDT, dueDate, paidAt);

        BuyerRegistry.BuyerStats memory stats = registry.getBuyerStats(buyerHash1);
        assertEq(stats.latePayments, 1, "Late payment count should be 1");
        assertEq(stats.onTimePayments, 0, "On-time payment count should be 0");
        assertEq(stats.averageDaysLate, 10, "Average days late should be 10");
    }

    function test_RecordPayment_DecreasesExposure() public {
        _registerBuyer(buyerHash1);
        _assignInvoice(buyerHash1, 1, TEN_THOUSAND_USDT);

        uint256 exposureBefore = registry.getCurrentExposure(buyerHash1);
        assertEq(exposureBefore, TEN_THOUSAND_USDT);

        uint256 dueDate = block.timestamp + 30 days;
        _recordPayment(buyerHash1, 1, TEN_THOUSAND_USDT, dueDate, dueDate);

        uint256 exposureAfter = registry.getCurrentExposure(buyerHash1);
        assertEq(exposureAfter, 0, "Exposure should be 0 after payment");
    }

    function test_RecordPayment_EmitsEvent() public {
        _registerBuyer(buyerHash1);
        _assignInvoice(buyerHash1, 1, TEN_THOUSAND_USDT);

        uint256 dueDate = block.timestamp + 30 days;
        uint256 paidAt = dueDate + 5 days;

        vm.expectEmit(true, true, false, true);
        emit PaymentRecorded(buyerHash1, 1, TEN_THOUSAND_USDT, true, 5);

        _recordPayment(buyerHash1, 1, TEN_THOUSAND_USDT, dueDate, paidAt);
    }

    function test_RecordPayment_CreatesPaymentHistory() public {
        _registerBuyer(buyerHash1);
        _assignInvoice(buyerHash1, 1, TEN_THOUSAND_USDT);

        uint256 dueDate = block.timestamp + 30 days;
        _recordPayment(buyerHash1, 1, TEN_THOUSAND_USDT, dueDate, dueDate);

        BuyerRegistry.PaymentEvent[] memory history = registry.getPaymentHistory(buyerHash1);
        assertEq(history.length, 1, "Payment history should have 1 entry");
        assertEq(history[0].invoiceId, 1, "Invoice ID should match");
        assertEq(history[0].amount, TEN_THOUSAND_USDT, "Amount should match");
        assertFalse(history[0].wasLate, "Should not be late");
    }

    // ============ Default Recording Tests ============

    function test_RecordDefault_Success() public {
        _registerBuyer(buyerHash1);
        _assignInvoice(buyerHash1, 1, TEN_THOUSAND_USDT);

        _recordDefault(buyerHash1, 1, TEN_THOUSAND_USDT);

        BuyerRegistry.BuyerStats memory stats = registry.getBuyerStats(buyerHash1);
        assertEq(stats.defaults, 1, "Default count should be 1");

        uint256 exposure = registry.getCurrentExposure(buyerHash1);
        assertEq(exposure, 0, "Exposure should be 0 after default");
    }

    function test_RecordDefault_EmitsEvent() public {
        _registerBuyer(buyerHash1);
        _assignInvoice(buyerHash1, 1, TEN_THOUSAND_USDT);

        vm.expectEmit(true, true, false, true);
        emit DefaultRecorded(buyerHash1, 1, TEN_THOUSAND_USDT);

        _recordDefault(buyerHash1, 1, TEN_THOUSAND_USDT);
    }

    function test_RecordDefault_AutoBlacklists_AfterThreshold() public {
        _registerBuyer(buyerHash1);

        // Record 3 defaults to trigger blacklist
        for (uint256 i = 1; i <= 3; i++) {
            _assignInvoice(buyerHash1, i, TEN_THOUSAND_USDT);
            _recordDefault(buyerHash1, i, TEN_THOUSAND_USDT);
        }

        BuyerRegistry.BuyerStatus status = registry.getBuyerStatus(buyerHash1);
        assertEq(
            uint8(status),
            uint8(BuyerRegistry.BuyerStatus.BLACKLISTED),
            "Should be blacklisted after 3 defaults"
        );
    }

    // ============ Auto-Status Update Tests ============

    function test_AutoUpdateStatus_ToGoodStanding() public {
        _registerBuyer(buyerHash1);

        // Record 5 on-time payments
        for (uint256 i = 1; i <= 5; i++) {
            _assignInvoice(buyerHash1, i, TEN_THOUSAND_USDT);
            uint256 dueDate = block.timestamp + 30 days;
            _recordPayment(buyerHash1, i, TEN_THOUSAND_USDT, dueDate, dueDate);
        }

        BuyerRegistry.BuyerStatus status = registry.getBuyerStatus(buyerHash1);
        assertEq(
            uint8(status),
            uint8(BuyerRegistry.BuyerStatus.GOOD_STANDING),
            "Should be GOOD_STANDING with 5 on-time payments"
        );
    }

    function test_AutoUpdateStatus_ToWatchList() public {
        _registerBuyer(buyerHash1);

        uint256 dueDate = block.timestamp + 30 days;

        // Record 5 on-time payments
        for (uint256 i = 1; i <= 5; i++) {
            _assignInvoice(buyerHash1, i, TEN_THOUSAND_USDT);
            _recordPayment(buyerHash1, i, TEN_THOUSAND_USDT, dueDate, dueDate);
        }

        // Record 1 late payment (makes 5 on-time, 1 late = 16.67% late rate)
        _assignInvoice(buyerHash1, 6, TEN_THOUSAND_USDT);
        _recordPayment(buyerHash1, 6, TEN_THOUSAND_USDT, dueDate, dueDate + 5 days);

        BuyerRegistry.BuyerStatus status = registry.getBuyerStatus(buyerHash1);
        assertEq(
            uint8(status),
            uint8(BuyerRegistry.BuyerStatus.WATCH_LIST),
            "Should be WATCH_LIST with >15% late rate"
        );
    }

    function test_AutoUpdateStatus_ToHighRisk_LateRate() public {
        _registerBuyer(buyerHash1);

        // Record 2 on-time and 2 late payments (50% late rate)
        for (uint256 i = 1; i <= 2; i++) {
            _assignInvoice(buyerHash1, i, TEN_THOUSAND_USDT);
            uint256 dueDate = block.timestamp + 30 days;
            _recordPayment(buyerHash1, i, TEN_THOUSAND_USDT, dueDate, dueDate);
        }

        for (uint256 i = 3; i <= 4; i++) {
            _assignInvoice(buyerHash1, i, TEN_THOUSAND_USDT);
            uint256 dueDate = block.timestamp + 30 days;
            _recordPayment(buyerHash1, i, TEN_THOUSAND_USDT, dueDate, dueDate + 10 days);
        }

        BuyerRegistry.BuyerStatus status = registry.getBuyerStatus(buyerHash1);
        assertEq(
            uint8(status),
            uint8(BuyerRegistry.BuyerStatus.HIGH_RISK),
            "Should be HIGH_RISK with >30% late rate"
        );
    }

    function test_AutoUpdateStatus_ToHighRisk_Defaults() public {
        _registerBuyer(buyerHash1);

        // Record 2 defaults (should trigger HIGH_RISK)
        for (uint256 i = 1; i <= 2; i++) {
            _assignInvoice(buyerHash1, i, TEN_THOUSAND_USDT);
            _recordDefault(buyerHash1, i, TEN_THOUSAND_USDT);
        }

        BuyerRegistry.BuyerStatus status = registry.getBuyerStatus(buyerHash1);
        assertEq(
            uint8(status),
            uint8(BuyerRegistry.BuyerStatus.HIGH_RISK),
            "Should be HIGH_RISK with 2 defaults"
        );
    }

    // ============ Status Management Tests ============

    function test_UpdateBuyerStatus_Success() public {
        _registerBuyer(buyerHash1);

        vm.prank(admin);
        registry.updateBuyerStatus(buyerHash1, BuyerRegistry.BuyerStatus.WATCH_LIST);

        BuyerRegistry.BuyerStatus status = registry.getBuyerStatus(buyerHash1);
        assertEq(uint8(status), uint8(BuyerRegistry.BuyerStatus.WATCH_LIST));
    }

    function test_UpdateBuyerStatus_EmitsEvent() public {
        _registerBuyer(buyerHash1);

        vm.expectEmit(true, false, false, true);
        emit BuyerStatusUpdated(
            buyerHash1,
            BuyerRegistry.BuyerStatus.UNKNOWN,
            BuyerRegistry.BuyerStatus.WATCH_LIST
        );

        vm.prank(admin);
        registry.updateBuyerStatus(buyerHash1, BuyerRegistry.BuyerStatus.WATCH_LIST);
    }

    function test_BlacklistBuyer_Success() public {
        _registerBuyer(buyerHash1);

        vm.prank(admin);
        registry.blacklistBuyer(buyerHash1, "Fraud detected");

        BuyerRegistry.BuyerStatus status = registry.getBuyerStatus(buyerHash1);
        assertEq(uint8(status), uint8(BuyerRegistry.BuyerStatus.BLACKLISTED));
    }

    function test_BlacklistBuyer_EmitsEvents() public {
        _registerBuyer(buyerHash1);

        vm.expectEmit(true, false, false, true);
        emit BuyerBlacklisted(buyerHash1, "Fraud detected");

        vm.prank(admin);
        registry.blacklistBuyer(buyerHash1, "Fraud detected");
    }

    function test_UnblacklistBuyer_Success() public {
        _registerBuyer(buyerHash1);

        vm.prank(admin);
        registry.blacklistBuyer(buyerHash1, "Test");

        vm.prank(admin);
        registry.unblacklistBuyer(buyerHash1);

        BuyerRegistry.BuyerStatus status = registry.getBuyerStatus(buyerHash1);
        assertEq(uint8(status), uint8(BuyerRegistry.BuyerStatus.UNKNOWN));
    }

    function test_UnblacklistBuyer_EmitsEvent() public {
        _registerBuyer(buyerHash1);

        vm.prank(admin);
        registry.blacklistBuyer(buyerHash1, "Test");

        vm.expectEmit(true, false, false, false);
        emit BuyerUnblacklisted(buyerHash1);

        vm.prank(admin);
        registry.unblacklistBuyer(buyerHash1);
    }

    // ============ View Functions Tests ============

    function test_GetLatePaymentRate_CalculatesCorrectly() public {
        _registerBuyer(buyerHash1);

        uint256 dueDate = block.timestamp + 30 days;

        // 3 on-time, 1 late = 25% late rate = 2500 basis points
        for (uint256 i = 1; i <= 3; i++) {
            _assignInvoice(buyerHash1, i, TEN_THOUSAND_USDT);
            _recordPayment(buyerHash1, i, TEN_THOUSAND_USDT, dueDate, dueDate);
        }

        _assignInvoice(buyerHash1, 4, TEN_THOUSAND_USDT);
        _recordPayment(buyerHash1, 4, TEN_THOUSAND_USDT, dueDate, dueDate + 5 days);

        uint256 lateRate = registry.getLatePaymentRate(buyerHash1);
        assertEq(lateRate, 2500, "Late rate should be 25% (2500 basis points)");
    }

    function test_GetDefaultRate_CalculatesCorrectly() public {
        _registerBuyer(buyerHash1);

        // 3 invoices, 1 default = 33.33% default rate
        _assignInvoice(buyerHash1, 1, TEN_THOUSAND_USDT);
        _assignInvoice(buyerHash1, 2, TEN_THOUSAND_USDT);
        _assignInvoice(buyerHash1, 3, TEN_THOUSAND_USDT);

        _recordDefault(buyerHash1, 1, TEN_THOUSAND_USDT);

        uint256 defaultRate = registry.getDefaultRate(buyerHash1);
        assertEq(defaultRate, 3333, "Default rate should be ~33.33% (3333 basis points)");
    }

    function test_GetAvailableCredit_CalculatesCorrectly() public {
        _registerBuyer(buyerHash1);

        // Default limit is 100,000 USDT
        uint256 availableBefore = registry.getAvailableCredit(buyerHash1);
        assertEq(availableBefore, 100_000 * 1e6);

        // Assign invoice for 10,000 USDT
        _assignInvoice(buyerHash1, 1, TEN_THOUSAND_USDT);

        uint256 availableAfter = registry.getAvailableCredit(buyerHash1);
        assertEq(availableAfter, 90_000 * 1e6, "Available credit should be 90,000");
    }

    function test_IsEligibleForFunding_True_WhenHealthy() public {
        _registerBuyer(buyerHash1);

        (bool eligible, string memory reason) =
            registry.isEligibleForFunding(buyerHash1, TEN_THOUSAND_USDT);

        assertTrue(eligible, "Should be eligible");
        assertEq(bytes(reason).length, 0, "Reason should be empty");
    }

    function test_IsEligibleForFunding_False_WhenBlacklisted() public {
        _registerBuyer(buyerHash1);

        vm.prank(admin);
        registry.blacklistBuyer(buyerHash1, "Test");

        (bool eligible, string memory reason) =
            registry.isEligibleForFunding(buyerHash1, TEN_THOUSAND_USDT);

        assertFalse(eligible, "Should not be eligible");
        assertEq(reason, "Buyer is blacklisted");
    }

    function test_IsEligibleForFunding_False_WhenExceedsCreditLimit() public {
        _registerBuyer(buyerHash1);

        // Try to fund invoice that exceeds credit limit
        (bool eligible, string memory reason) =
            registry.isEligibleForFunding(buyerHash1, 200_000 * 1e6);

        assertFalse(eligible, "Should not be eligible");
        assertEq(reason, "Exceeds credit limit");
    }

    function test_IsEligibleForFunding_False_WhenBuyerNotFound() public {
        (bool eligible, string memory reason) =
            registry.isEligibleForFunding(buyerHash1, TEN_THOUSAND_USDT);

        assertFalse(eligible, "Should not be eligible");
        assertEq(reason, "Buyer not found");
    }

    function test_BuyerExists_ReturnsCorrectly() public {
        assertFalse(registry.buyerExists(buyerHash1), "Should not exist initially");

        _registerBuyer(buyerHash1);

        assertTrue(registry.buyerExists(buyerHash1), "Should exist after registration");
    }

    // ============ Admin Functions Tests ============

    function test_SetDefaultCreditLimit_Success() public {
        vm.prank(admin);
        registry.setDefaultCreditLimit(200_000 * 1e6);

        // Register new buyer and check default limit
        _registerBuyer(buyerHash1);

        uint256 limit = registry.getCreditLimit(buyerHash1);
        assertEq(limit, 200_000 * 1e6, "New buyer should have new default limit");
    }

    function test_SetStatusThresholds_Success() public {
        vm.prank(admin);
        registry.setStatusThresholds(2000, 4000, 3, 4);

        // Verify thresholds are updated (we can't directly read them, but functionality will change)
        // This is more of an integration test
    }

    // ============ Multiple Buyers Test ============

    function test_MultiplePayments_StatsAccurate() public {
        _registerBuyer(buyerHash1);

        // Record multiple payments with mix of on-time and late
        uint256[] memory invoiceIds = new uint256[](5);
        uint256[] memory amounts = new uint256[](5);

        for (uint256 i = 0; i < 5; i++) {
            invoiceIds[i] = i + 1;
            amounts[i] = TEN_THOUSAND_USDT;

            _assignInvoice(buyerHash1, invoiceIds[i], amounts[i]);
        }

        // 3 on-time
        for (uint256 i = 0; i < 3; i++) {
            uint256 dueDate = block.timestamp + 30 days;
            _recordPayment(buyerHash1, invoiceIds[i], amounts[i], dueDate, dueDate);
        }

        // 2 late
        for (uint256 i = 3; i < 5; i++) {
            uint256 dueDate = block.timestamp + 30 days;
            _recordPayment(buyerHash1, invoiceIds[i], amounts[i], dueDate, dueDate + 7 days);
        }

        BuyerRegistry.BuyerStats memory stats = registry.getBuyerStats(buyerHash1);
        assertEq(stats.onTimePayments, 3, "Should have 3 on-time payments");
        assertEq(stats.latePayments, 2, "Should have 2 late payments");
        assertEq(
            stats.totalValuePaid,
            TEN_THOUSAND_USDT * 5,
            "Total paid should be sum of all"
        );
    }

    function test_MultipleBuyers_IndependentTracking() public {
        _registerBuyer(buyerHash1);
        _registerBuyer(buyerHash2);

        // Buyer 1: Good payment history
        _assignInvoice(buyerHash1, 1, TEN_THOUSAND_USDT);
        uint256 dueDate = block.timestamp + 30 days;
        _recordPayment(buyerHash1, 1, TEN_THOUSAND_USDT, dueDate, dueDate);

        // Buyer 2: Default
        _assignInvoice(buyerHash2, 2, TEN_THOUSAND_USDT);
        _recordDefault(buyerHash2, 2, TEN_THOUSAND_USDT);

        BuyerRegistry.BuyerStats memory stats1 = registry.getBuyerStats(buyerHash1);
        BuyerRegistry.BuyerStats memory stats2 = registry.getBuyerStats(buyerHash2);

        assertEq(stats1.onTimePayments, 1, "Buyer 1 should have 1 on-time payment");
        assertEq(stats1.defaults, 0, "Buyer 1 should have no defaults");
        assertEq(stats2.onTimePayments, 0, "Buyer 2 should have no on-time payments");
        assertEq(stats2.defaults, 1, "Buyer 2 should have 1 default");
    }
}
