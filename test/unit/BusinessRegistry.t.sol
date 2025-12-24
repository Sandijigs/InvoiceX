// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TestHelper} from "../helpers/TestHelper.sol";
import {BusinessRegistry} from "../../src/core/BusinessRegistry.sol";

/**
 * @title BusinessRegistryTest
 * @notice Comprehensive tests for BusinessRegistry contract
 */
contract BusinessRegistryTest is TestHelper {
    BusinessRegistry public registry;

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant CREDIT_UPDATER_ROLE = keccak256("CREDIT_UPDATER_ROLE");
    bytes32 public constant STATS_UPDATER_ROLE = keccak256("STATS_UPDATER_ROLE");

    // Events
    event BusinessRegistered(uint256 indexed businessId, address indexed owner);
    event BusinessVerified(uint256 indexed businessId, uint256 creditScore);
    event BusinessStatusUpdated(
        uint256 indexed businessId,
        BusinessRegistry.BusinessStatus oldStatus,
        BusinessRegistry.BusinessStatus newStatus
    );
    event CreditScoreUpdated(uint256 indexed businessId, uint256 oldScore, uint256 newScore);
    event AuthorizedSignerAdded(uint256 indexed businessId, address signer);
    event AuthorizedSignerRemoved(uint256 indexed businessId, address signer);
    event BusinessSuspended(uint256 indexed businessId, string reason);
    event BusinessBlacklisted(uint256 indexed businessId, string reason);
    event StatsUpdated(uint256 indexed businessId);

    function setUp() public override {
        super.setUp();

        // Deploy BusinessRegistry
        vm.prank(admin);
        registry = new BusinessRegistry();

        // Grant roles
        vm.startPrank(admin);
        registry.grantRole(VERIFIER_ROLE, operator);
        registry.grantRole(CREDIT_UPDATER_ROLE, oracle);
        registry.grantRole(STATS_UPDATER_ROLE, operator);
        vm.stopPrank();
    }

    // ============ Helper Functions ============

    function _registerBusiness(address owner) internal returns (uint256) {
        bytes32 businessHash = generateBuyerHash("TestBusiness");
        string memory businessURI = "ipfs://QmTest123";

        vm.prank(owner);
        return registry.registerBusiness(businessHash, businessURI);
    }

    function _verifyBusiness(uint256 businessId, uint256 creditScore) internal {
        bytes32 zkProof = keccak256("zkproof");

        vm.prank(operator);
        registry.verifyBusiness(businessId, zkProof, creditScore);
    }

    // ============ Constructor Tests ============

    function test_Constructor_GrantsAdminRole() public view {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
    }

    // ============ Registration Tests ============

    function test_Register_Success() public {
        bytes32 businessHash = generateBuyerHash("TestBusiness");
        string memory businessURI = "ipfs://QmTest123";

        vm.prank(seller1);
        uint256 businessId = registry.registerBusiness(businessHash, businessURI);

        assertEq(businessId, 1, "Business ID should be 1");

        BusinessRegistry.Business memory business = registry.getBusiness(businessId);
        assertEq(business.owner, seller1, "Owner should be seller1");
        assertEq(business.businessHash, businessHash, "Business hash should match");
        assertEq(business.businessURI, businessURI, "Business URI should match");
        assertEq(
            uint8(business.status),
            uint8(BusinessRegistry.BusinessStatus.PENDING),
            "Status should be PENDING"
        );
        assertGt(business.registeredAt, 0, "Registered at should be set");
    }

    function test_Register_EmitsBusinessRegistered() public {
        bytes32 businessHash = generateBuyerHash("TestBusiness");
        string memory businessURI = "ipfs://QmTest123";

        vm.expectEmit(true, true, false, false);
        emit BusinessRegistered(1, seller1);

        vm.prank(seller1);
        registry.registerBusiness(businessHash, businessURI);
    }

    function test_Register_OwnerIsAuthorizedSigner() public {
        uint256 businessId = _registerBusiness(seller1);

        assertTrue(
            registry.isAuthorizedSigner(businessId, seller1),
            "Owner should be authorized signer"
        );
    }

    function test_Register_RevertWhen_AlreadyExists() public {
        _registerBusiness(seller1);

        bytes32 businessHash = generateBuyerHash("TestBusiness");
        string memory businessURI = "ipfs://QmTest123";

        vm.expectRevert(BusinessRegistry.BusinessAlreadyExists.selector);
        vm.prank(seller1);
        registry.registerBusiness(businessHash, businessURI);
    }

    function test_GetBusinessByOwner_ReturnsCorrectId() public {
        uint256 businessId = _registerBusiness(seller1);

        uint256 foundId = registry.getBusinessByOwner(seller1);
        assertEq(foundId, businessId, "Should return correct business ID");
    }

    // ============ Verification Tests ============

    function test_Verify_Success() public {
        uint256 businessId = _registerBusiness(seller1);
        uint256 creditScore = 75;

        _verifyBusiness(businessId, creditScore);

        BusinessRegistry.Business memory business = registry.getBusiness(businessId);
        assertEq(business.creditScore, creditScore, "Credit score should match");
        assertEq(
            uint8(business.status),
            uint8(BusinessRegistry.BusinessStatus.VERIFIED),
            "Status should be VERIFIED"
        );
        assertGt(business.verifiedAt, 0, "Verified at should be set");
    }

    function test_Verify_EmitsBusinessVerified() public {
        uint256 businessId = _registerBusiness(seller1);
        uint256 creditScore = 75;
        bytes32 zkProof = keccak256("zkproof");

        vm.expectEmit(true, false, false, true);
        emit BusinessVerified(businessId, creditScore);

        vm.prank(operator);
        registry.verifyBusiness(businessId, zkProof, creditScore);
    }

    function test_Verify_RevertWhen_NotVerifier() public {
        uint256 businessId = _registerBusiness(seller1);
        bytes32 zkProof = keccak256("zkproof");

        vm.prank(seller1);
        vm.expectRevert();
        registry.verifyBusiness(businessId, zkProof, 75);
    }

    function test_Verify_RevertWhen_NotPending() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        bytes32 zkProof = keccak256("zkproof2");

        // Try to verify again
        vm.prank(operator);
        vm.expectRevert(BusinessRegistry.BusinessNotVerified.selector);
        registry.verifyBusiness(businessId, zkProof, 80);
    }

    function test_Verify_RevertWhen_InvalidCreditScore() public {
        uint256 businessId = _registerBusiness(seller1);
        bytes32 zkProof = keccak256("zkproof");

        vm.prank(operator);
        vm.expectRevert(BusinessRegistry.InvalidCreditScore.selector);
        registry.verifyBusiness(businessId, zkProof, 101);
    }

    // ============ Authorized Signer Tests ============

    function test_AddAuthorizedSigner_Success() public {
        uint256 businessId = _registerBusiness(seller1);

        vm.prank(seller1);
        registry.addAuthorizedSigner(businessId, seller2);

        assertTrue(
            registry.isAuthorizedSigner(businessId, seller2),
            "Seller2 should be authorized"
        );
    }

    function test_AddAuthorizedSigner_EmitsEvent() public {
        uint256 businessId = _registerBusiness(seller1);

        vm.expectEmit(true, false, false, true);
        emit AuthorizedSignerAdded(businessId, seller2);

        vm.prank(seller1);
        registry.addAuthorizedSigner(businessId, seller2);
    }

    function test_AddAuthorizedSigner_RevertWhen_NotOwner() public {
        uint256 businessId = _registerBusiness(seller1);

        vm.prank(seller2);
        vm.expectRevert(BusinessRegistry.NotBusinessOwner.selector);
        registry.addAuthorizedSigner(businessId, seller2);
    }

    function test_AddAuthorizedSigner_RevertWhen_ZeroAddress() public {
        uint256 businessId = _registerBusiness(seller1);

        vm.prank(seller1);
        vm.expectRevert(BusinessRegistry.ZeroAddress.selector);
        registry.addAuthorizedSigner(businessId, address(0));
    }

    function test_RemoveAuthorizedSigner_Success() public {
        uint256 businessId = _registerBusiness(seller1);

        vm.startPrank(seller1);
        registry.addAuthorizedSigner(businessId, seller2);
        registry.removeAuthorizedSigner(businessId, seller2);
        vm.stopPrank();

        assertFalse(
            registry.isAuthorizedSigner(businessId, seller2),
            "Seller2 should not be authorized"
        );
    }

    function test_RemoveAuthorizedSigner_EmitsEvent() public {
        uint256 businessId = _registerBusiness(seller1);

        vm.startPrank(seller1);
        registry.addAuthorizedSigner(businessId, seller2);

        vm.expectEmit(true, false, false, true);
        emit AuthorizedSignerRemoved(businessId, seller2);

        registry.removeAuthorizedSigner(businessId, seller2);
        vm.stopPrank();
    }

    function test_RemoveAuthorizedSigner_RevertWhen_LastSigner() public {
        uint256 businessId = _registerBusiness(seller1);

        vm.prank(seller1);
        vm.expectRevert(BusinessRegistry.CannotRemoveLastSigner.selector);
        registry.removeAuthorizedSigner(businessId, seller1);
    }

    // ============ Credit Score Tests ============

    function test_UpdateCreditScore_Success() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        uint256 newScore = 85;

        vm.prank(oracle);
        registry.updateCreditScore(businessId, newScore);

        BusinessRegistry.Business memory business = registry.getBusiness(businessId);
        assertEq(business.creditScore, newScore, "Credit score should be updated");
    }

    function test_UpdateCreditScore_EmitsEvent() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        vm.expectEmit(true, false, false, true);
        emit CreditScoreUpdated(businessId, 75, 85);

        vm.prank(oracle);
        registry.updateCreditScore(businessId, 85);
    }

    function test_UpdateCreditScore_AutoSuspendsWhenTooLow() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        vm.prank(oracle);
        registry.updateCreditScore(businessId, 15);

        BusinessRegistry.Business memory business = registry.getBusiness(businessId);
        assertEq(
            uint8(business.status),
            uint8(BusinessRegistry.BusinessStatus.SUSPENDED),
            "Should be auto-suspended"
        );
    }

    // ============ Stats Tracking Tests ============

    function test_RecordInvoiceSubmitted_Success() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        vm.prank(operator);
        registry.recordInvoiceSubmitted(businessId);

        BusinessRegistry.BusinessStats memory stats = registry.getBusinessStats(businessId);
        assertEq(stats.totalInvoicesSubmitted, 1, "Should have 1 invoice submitted");
    }

    function test_RecordInvoiceSubmitted_ChangesStatusToActive() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        vm.prank(operator);
        registry.recordInvoiceSubmitted(businessId);

        BusinessRegistry.Business memory business = registry.getBusiness(businessId);
        assertEq(
            uint8(business.status),
            uint8(BusinessRegistry.BusinessStatus.ACTIVE),
            "Status should be ACTIVE"
        );
    }

    function test_RecordInvoiceFunded_UpdatesStats() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        uint256 amount = TEN_THOUSAND_USDT;

        vm.prank(operator);
        registry.recordInvoiceFunded(businessId, amount);

        BusinessRegistry.BusinessStats memory stats = registry.getBusinessStats(businessId);
        assertEq(stats.totalInvoicesFunded, 1, "Should have 1 invoice funded");
        assertEq(stats.totalValueFunded, amount, "Total value should match");
    }

    function test_RecordRepayment_OnTime() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        uint256 amount = TEN_THOUSAND_USDT;

        vm.prank(operator);
        registry.recordRepayment(businessId, amount, true);

        BusinessRegistry.BusinessStats memory stats = registry.getBusinessStats(businessId);
        assertEq(stats.successfulRepayments, 1, "Should have 1 successful repayment");
        assertEq(stats.totalValueRepaid, amount, "Repaid value should match");
    }

    function test_RecordRepayment_Late() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        uint256 amount = TEN_THOUSAND_USDT;

        vm.prank(operator);
        registry.recordRepayment(businessId, amount, false);

        BusinessRegistry.BusinessStats memory stats = registry.getBusinessStats(businessId);
        assertEq(stats.lateRepayments, 1, "Should have 1 late repayment");
        assertEq(stats.totalValueRepaid, amount, "Repaid value should match");
    }

    function test_RecordDefault_IncrementsCount() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        vm.prank(operator);
        registry.recordDefault(businessId);

        BusinessRegistry.BusinessStats memory stats = registry.getBusinessStats(businessId);
        assertEq(stats.defaults, 1, "Should have 1 default");
    }

    function test_RecordDefault_AutoSuspendsAfterThreshold() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        vm.startPrank(operator);
        registry.recordDefault(businessId);
        registry.recordDefault(businessId);
        registry.recordDefault(businessId); // 3rd default triggers suspension
        vm.stopPrank();

        BusinessRegistry.Business memory business = registry.getBusiness(businessId);
        assertEq(
            uint8(business.status),
            uint8(BusinessRegistry.BusinessStatus.SUSPENDED),
            "Should be auto-suspended after 3 defaults"
        );
    }

    // ============ Status Management Tests ============

    function test_SuspendBusiness_Success() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        string memory reason = "Manual suspension for review";

        vm.prank(admin);
        registry.suspendBusiness(businessId, reason);

        BusinessRegistry.Business memory business = registry.getBusiness(businessId);
        assertEq(
            uint8(business.status),
            uint8(BusinessRegistry.BusinessStatus.SUSPENDED),
            "Should be suspended"
        );
    }

    function test_SuspendBusiness_EmitsEvent() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        string memory reason = "Manual suspension";

        vm.expectEmit(true, false, false, true);
        emit BusinessSuspended(businessId, reason);

        vm.prank(admin);
        registry.suspendBusiness(businessId, reason);
    }

    function test_ReinstateBusiness_Success() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        vm.startPrank(admin);
        registry.suspendBusiness(businessId, "Test");
        registry.reinstateBusiness(businessId);
        vm.stopPrank();

        BusinessRegistry.Business memory business = registry.getBusiness(businessId);
        assertEq(
            uint8(business.status),
            uint8(BusinessRegistry.BusinessStatus.VERIFIED),
            "Should be reinstated to VERIFIED"
        );
    }

    function test_ReinstateBusiness_ToActiveIfHasInvoices() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        vm.prank(operator);
        registry.recordInvoiceSubmitted(businessId);

        vm.startPrank(admin);
        registry.suspendBusiness(businessId, "Test");
        registry.reinstateBusiness(businessId);
        vm.stopPrank();

        BusinessRegistry.Business memory business = registry.getBusiness(businessId);
        assertEq(
            uint8(business.status),
            uint8(BusinessRegistry.BusinessStatus.ACTIVE),
            "Should be reinstated to ACTIVE"
        );
    }

    function test_BlacklistBusiness_Permanent() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        string memory reason = "Fraudulent activity";

        vm.prank(admin);
        registry.blacklistBusiness(businessId, reason);

        BusinessRegistry.Business memory business = registry.getBusiness(businessId);
        assertEq(
            uint8(business.status),
            uint8(BusinessRegistry.BusinessStatus.BLACKLISTED),
            "Should be blacklisted"
        );
    }

    function test_BlacklistBusiness_EmitsEvent() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        string memory reason = "Fraud";

        vm.expectEmit(true, false, false, true);
        emit BusinessBlacklisted(businessId, reason);

        vm.prank(admin);
        registry.blacklistBusiness(businessId, reason);
    }

    // ============ View Function Tests ============

    function test_CanSubmitInvoices_ReturnsCorrectly() public {
        uint256 businessId = _registerBusiness(seller1);

        assertFalse(
            registry.canSubmitInvoices(businessId),
            "Pending business cannot submit invoices"
        );

        _verifyBusiness(businessId, 75);

        assertTrue(
            registry.canSubmitInvoices(businessId),
            "Verified business can submit invoices"
        );

        vm.prank(admin);
        registry.suspendBusiness(businessId, "Test");

        assertFalse(
            registry.canSubmitInvoices(businessId),
            "Suspended business cannot submit invoices"
        );
    }

    function test_IsBusinessVerified_ReturnsCorrectly() public {
        uint256 businessId = _registerBusiness(seller1);

        assertFalse(registry.isBusinessVerified(businessId), "Should not be verified yet");

        _verifyBusiness(businessId, 75);

        assertTrue(registry.isBusinessVerified(businessId), "Should be verified");
    }

    function test_IsBusinessActive_ReturnsCorrectly() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        assertFalse(registry.isBusinessActive(businessId), "Should not be active yet");

        vm.prank(operator);
        registry.recordInvoiceSubmitted(businessId);

        assertTrue(registry.isBusinessActive(businessId), "Should be active");
    }

    function test_GetRepaymentRate_CalculatesCorrectly() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        // No repayments yet - should be 100%
        assertEq(registry.getRepaymentRate(businessId), 100, "Should be 100% initially");

        vm.startPrank(operator);
        // 3 on-time, 1 late = 75%
        registry.recordRepayment(businessId, THOUSAND_USDT, true);
        registry.recordRepayment(businessId, THOUSAND_USDT, true);
        registry.recordRepayment(businessId, THOUSAND_USDT, true);
        registry.recordRepayment(businessId, THOUSAND_USDT, false);
        vm.stopPrank();

        assertEq(registry.getRepaymentRate(businessId), 75, "Should be 75%");
    }

    // ============ Edge Cases ============

    function test_GetBusiness_RevertWhen_NotFound() public {
        vm.expectRevert(BusinessRegistry.BusinessNotFound.selector);
        registry.getBusiness(999);
    }

    function test_MultipleBusinesses_IndependentStats() public {
        uint256 businessId1 = _registerBusiness(seller1);
        uint256 businessId2 = _registerBusiness(seller2);

        _verifyBusiness(businessId1, 75);
        _verifyBusiness(businessId2, 80);

        vm.startPrank(operator);
        registry.recordInvoiceSubmitted(businessId1);
        registry.recordInvoiceFunded(businessId1, TEN_THOUSAND_USDT);
        vm.stopPrank();

        BusinessRegistry.BusinessStats memory stats1 = registry.getBusinessStats(businessId1);
        BusinessRegistry.BusinessStats memory stats2 = registry.getBusinessStats(businessId2);

        assertEq(stats1.totalInvoicesSubmitted, 1, "Business 1 should have 1 invoice");
        assertEq(stats2.totalInvoicesSubmitted, 0, "Business 2 should have 0 invoices");
    }

    function test_SuspendBlacklisted_DoesNotChange() public {
        uint256 businessId = _registerBusiness(seller1);
        _verifyBusiness(businessId, 75);

        vm.startPrank(admin);
        registry.blacklistBusiness(businessId, "Fraud");
        registry.suspendBusiness(businessId, "Test");
        vm.stopPrank();

        BusinessRegistry.Business memory business = registry.getBusiness(businessId);
        assertEq(
            uint8(business.status),
            uint8(BusinessRegistry.BusinessStatus.BLACKLISTED),
            "Should remain blacklisted"
        );
    }
}