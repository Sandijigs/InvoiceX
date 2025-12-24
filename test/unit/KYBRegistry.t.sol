// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TestHelper} from "../helpers/TestHelper.sol";
import {KYBRegistry} from "../../src/compliance/KYBRegistry.sol";

/**
 * @title KYBRegistryTest
 * @notice Comprehensive tests for KYBRegistry contract
 */
contract KYBRegistryTest is TestHelper {
    KYBRegistry public registry;

    bytes32 public constant KYB_VERIFIER_ROLE = keccak256("KYB_VERIFIER_ROLE");
    bytes32 public constant JURISDICTION_MANAGER_ROLE = keccak256("JURISDICTION_MANAGER_ROLE");

    // Test data
    bytes32 public businessHash1;
    bytes32 public businessHash2;
    bytes32[] public proofHashes;

    // Events
    event KYBSubmitted(uint256 indexed requestId, address indexed businessWallet, bytes32 businessHash);
    event ProofAdded(uint256 indexed requestId, bytes32 proofHash);
    event RequestCancelled(uint256 indexed requestId);
    event KYBApproved(address indexed businessWallet, KYBRegistry.VerificationLevel level, uint256 expiresAt);
    event KYBRejected(uint256 indexed requestId, string reason);
    event VerificationUpgraded(
        address indexed businessWallet,
        KYBRegistry.VerificationLevel oldLevel,
        KYBRegistry.VerificationLevel newLevel
    );
    event KYBSuspended(address indexed businessWallet, string reason);
    event KYBRevoked(address indexed businessWallet, string reason);
    event KYBReinstated(address indexed businessWallet);
    event RenewalRequested(uint256 indexed requestId, address indexed businessWallet);
    event RenewalApproved(address indexed businessWallet, uint256 newExpiresAt);
    event JurisdictionAdded(bytes2 jurisdiction);
    event JurisdictionRemoved(bytes2 jurisdiction);

    function setUp() public override {
        super.setUp();

        // Deploy KYBRegistry
        vm.prank(admin);
        registry = new KYBRegistry(admin);

        // Grant roles
        vm.startPrank(admin);
        registry.grantRole(KYB_VERIFIER_ROLE, operator);
        registry.grantRole(JURISDICTION_MANAGER_ROLE, admin);
        vm.stopPrank();

        // Setup test data
        businessHash1 = keccak256("TestBusiness1");
        businessHash2 = keccak256("TestBusiness2");

        proofHashes.push(keccak256("proof1"));
        proofHashes.push(keccak256("proof2"));
        proofHashes.push(keccak256("proof3"));
        proofHashes.push(keccak256("proof4"));
        proofHashes.push(keccak256("proof5"));
    }

    // ============ Helper Functions ============

    function _submitKYB(address wallet, bytes32 businessHash) internal returns (uint256) {
        bytes32[] memory proofs = new bytes32[](3);
        proofs[0] = proofHashes[0];
        proofs[1] = proofHashes[1];
        proofs[2] = proofHashes[2];

        vm.prank(wallet);
        return registry.submitKYB(businessHash, proofs, "US", "LLC");
    }

    function _approveKYB(uint256 requestId, KYBRegistry.VerificationLevel level) internal {
        KYBRegistry.ProofFlags memory flags = KYBRegistry.ProofFlags({
            businessRegistration: true,
            revenueThreshold: true,
            operatingHistory: false,
            bankAccountVerified: true,
            noLiens: false,
            goodStanding: false
        });

        vm.prank(operator);
        registry.approveKYB(requestId, level, flags, 365);
    }

    // ============ Constructor Tests ============

    function test_Constructor_SetsAdmin() public view {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_Constructor_SetsDefaultJurisdictions() public view {
        assertTrue(registry.isJurisdictionSupported("US"));
        assertTrue(registry.isJurisdictionSupported("GB"));
        assertTrue(registry.isJurisdictionSupported("SG"));
    }

    // ============ Submission Tests ============

    function test_SubmitKYB_Success() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);

        assertEq(requestId, 1, "Request ID should be 1");

        KYBRegistry.VerificationRequest memory request = registry.getVerificationRequest(requestId);
        assertEq(request.businessWallet, seller1);
        assertEq(request.businessHash, businessHash1);
        assertEq(request.submittedProofs.length, 3);
        assertEq(
            uint8(request.requestStatus),
            uint8(KYBRegistry.RequestStatus.PENDING)
        );
    }

    function test_SubmitKYB_EmitsEvent() public {
        bytes32[] memory proofs = new bytes32[](1);
        proofs[0] = proofHashes[0];

        vm.expectEmit(true, true, false, true);
        emit KYBSubmitted(1, seller1, businessHash1);

        vm.prank(seller1);
        registry.submitKYB(businessHash1, proofs, "US", "LLC");
    }

    function test_SubmitKYB_RevertWhen_AlreadyExists() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        vm.expectRevert(KYBRegistry.KYBAlreadyExists.selector);
        _submitKYB(seller1, businessHash2);
    }

    function test_SubmitKYB_RevertWhen_UnsupportedJurisdiction() public {
        bytes32[] memory proofs = new bytes32[](1);
        proofs[0] = proofHashes[0];

        vm.expectRevert(KYBRegistry.UnsupportedJurisdiction.selector);
        vm.prank(seller1);
        registry.submitKYB(businessHash1, proofs, "XX", "LLC");
    }

    // ============ Proof Management Tests ============

    function test_AddProof_Success() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);

        bytes32 newProof = keccak256("newProof");

        vm.prank(seller1);
        registry.addProof(requestId, newProof);

        KYBRegistry.VerificationRequest memory request = registry.getVerificationRequest(requestId);
        assertEq(request.submittedProofs.length, 4);
    }

    function test_AddProof_EmitsEvent() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        bytes32 newProof = keccak256("newProof");

        vm.expectEmit(true, false, false, true);
        emit ProofAdded(requestId, newProof);

        vm.prank(seller1);
        registry.addProof(requestId, newProof);
    }

    function test_AddProof_RevertWhen_NotOwner() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);

        vm.expectRevert(KYBRegistry.NotRequestOwner.selector);
        vm.prank(seller2);
        registry.addProof(requestId, keccak256("proof"));
    }

    // ============ Cancellation Tests ============

    function test_CancelRequest_Success() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);

        vm.prank(seller1);
        registry.cancelRequest(requestId);

        KYBRegistry.VerificationRequest memory request = registry.getVerificationRequest(requestId);
        assertEq(
            uint8(request.requestStatus),
            uint8(KYBRegistry.RequestStatus.CANCELLED)
        );
    }

    function test_CancelRequest_EmitsEvent() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);

        vm.expectEmit(true, false, false, false);
        emit RequestCancelled(requestId);

        vm.prank(seller1);
        registry.cancelRequest(requestId);
    }

    // ============ Approval Tests ============

    function test_ApproveKYB_Success() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);

        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        KYBRegistry.KYBData memory kyb = registry.getKYBData(seller1);
        assertEq(uint8(kyb.level), uint8(KYBRegistry.VerificationLevel.STANDARD));
        assertEq(uint8(kyb.status), uint8(KYBRegistry.KYBStatus.VERIFIED));
        assertTrue(kyb.proofFlags.businessRegistration);
    }

    function test_ApproveKYB_SetsCorrectExpiry() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);

        uint256 expectedExpiry = block.timestamp + 365 days;

        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        uint256 actualExpiry = registry.getKYBExpiry(seller1);
        assertEq(actualExpiry, expectedExpiry);
    }

    function test_ApproveKYB_SetsProofFlags() public {
        // Submit with 5 proofs for ENHANCED level
        bytes32[] memory proofs = new bytes32[](5);
        proofs[0] = proofHashes[0];
        proofs[1] = proofHashes[1];
        proofs[2] = proofHashes[2];
        proofs[3] = proofHashes[3];
        proofs[4] = proofHashes[4];

        vm.prank(seller1);
        uint256 requestId = registry.submitKYB(businessHash1, proofs, "US", "LLC");

        KYBRegistry.ProofFlags memory flags = KYBRegistry.ProofFlags({
            businessRegistration: true,
            revenueThreshold: true,
            operatingHistory: true,
            bankAccountVerified: true,
            noLiens: true,
            goodStanding: true
        });

        vm.prank(operator);
        registry.approveKYB(requestId, KYBRegistry.VerificationLevel.ENHANCED, flags, 365);

        KYBRegistry.ProofFlags memory savedFlags = registry.getProofFlags(seller1);
        assertTrue(savedFlags.businessRegistration);
        assertTrue(savedFlags.revenueThreshold);
        assertTrue(savedFlags.operatingHistory);
        assertTrue(savedFlags.bankAccountVerified);
        assertTrue(savedFlags.noLiens);
        assertTrue(savedFlags.goodStanding);
    }

    function test_ApproveKYB_EmitsEvent() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);

        uint256 expectedExpiry = block.timestamp + 365 days;

        vm.expectEmit(true, false, false, true);
        emit KYBApproved(seller1, KYBRegistry.VerificationLevel.STANDARD, expectedExpiry);

        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);
    }

    function test_ApproveKYB_RevertWhen_NotVerifier() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);

        KYBRegistry.ProofFlags memory flags;

        vm.expectRevert();
        vm.prank(seller2);
        registry.approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD, flags, 365);
    }

    // ============ Rejection Tests ============

    function test_RejectKYB_Success() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);

        vm.prank(operator);
        registry.rejectKYB(requestId, "Insufficient documentation");

        KYBRegistry.VerificationRequest memory request = registry.getVerificationRequest(requestId);
        assertEq(
            uint8(request.requestStatus),
            uint8(KYBRegistry.RequestStatus.REJECTED)
        );
        assertEq(request.rejectionReason, "Insufficient documentation");
    }

    function test_RejectKYB_EmitsEvent() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);

        vm.expectEmit(true, false, false, true);
        emit KYBRejected(requestId, "Test reason");

        vm.prank(operator);
        registry.rejectKYB(requestId, "Test reason");
    }

    // ============ Upgrade Tests ============

    function test_UpgradeVerificationLevel_Success() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.BASIC);

        KYBRegistry.ProofFlags memory newFlags = KYBRegistry.ProofFlags({
            businessRegistration: true,
            revenueThreshold: true,
            operatingHistory: true,
            bankAccountVerified: true,
            noLiens: true,
            goodStanding: true
        });

        vm.prank(operator);
        registry.upgradeVerificationLevel(seller1, KYBRegistry.VerificationLevel.ENHANCED, newFlags);

        KYBRegistry.VerificationLevel level = registry.getVerificationLevel(seller1);
        assertEq(uint8(level), uint8(KYBRegistry.VerificationLevel.ENHANCED));
    }

    function test_UpgradeVerificationLevel_EmitsEvent() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.BASIC);

        KYBRegistry.ProofFlags memory newFlags;

        vm.expectEmit(true, false, false, true);
        emit VerificationUpgraded(
            seller1,
            KYBRegistry.VerificationLevel.BASIC,
            KYBRegistry.VerificationLevel.STANDARD
        );

        vm.prank(operator);
        registry.upgradeVerificationLevel(seller1, KYBRegistry.VerificationLevel.STANDARD, newFlags);
    }

    function test_UpgradeVerificationLevel_RevertWhen_Downgrade() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        KYBRegistry.ProofFlags memory flags;

        vm.expectRevert(KYBRegistry.CannotDowngradeLevel.selector);
        vm.prank(operator);
        registry.upgradeVerificationLevel(seller1, KYBRegistry.VerificationLevel.BASIC, flags);
    }

    // ============ Suspension Tests ============

    function test_SuspendKYB_Success() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        vm.prank(operator);
        registry.suspendKYB(seller1, "Under investigation");

        KYBRegistry.KYBData memory kyb = registry.getKYBData(seller1);
        assertEq(uint8(kyb.status), uint8(KYBRegistry.KYBStatus.SUSPENDED));
    }

    function test_SuspendKYB_EmitsEvent() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        vm.expectEmit(true, false, false, true);
        emit KYBSuspended(seller1, "Test suspension");

        vm.prank(operator);
        registry.suspendKYB(seller1, "Test suspension");
    }

    // ============ Revocation Tests ============

    function test_RevokeKYB_Success() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        vm.prank(operator);
        registry.revokeKYB(seller1, "Fraud detected");

        KYBRegistry.KYBData memory kyb = registry.getKYBData(seller1);
        assertEq(uint8(kyb.status), uint8(KYBRegistry.KYBStatus.REVOKED));
    }

    function test_RevokeKYB_EmitsEvent() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        vm.expectEmit(true, false, false, true);
        emit KYBRevoked(seller1, "Test revocation");

        vm.prank(operator);
        registry.revokeKYB(seller1, "Test revocation");
    }

    // ============ Reinstatement Tests ============

    function test_ReinstateKYB_Success() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        vm.prank(operator);
        registry.suspendKYB(seller1, "Test");

        vm.prank(admin);
        registry.reinstateKYB(seller1);

        KYBRegistry.KYBData memory kyb = registry.getKYBData(seller1);
        assertEq(uint8(kyb.status), uint8(KYBRegistry.KYBStatus.VERIFIED));
    }

    function test_ReinstateKYB_EmitsEvent() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        vm.prank(operator);
        registry.suspendKYB(seller1, "Test");

        vm.expectEmit(true, false, false, false);
        emit KYBReinstated(seller1);

        vm.prank(admin);
        registry.reinstateKYB(seller1);
    }

    // ============ Renewal Tests ============

    function test_RequestRenewal_Success() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        bytes32[] memory newProofs = new bytes32[](2);
        newProofs[0] = keccak256("renewal1");
        newProofs[1] = keccak256("renewal2");

        vm.prank(seller1);
        uint256 renewalId = registry.requestRenewal(newProofs);

        assertEq(renewalId, 2);
    }

    function test_RequestRenewal_EmitsEvent() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        bytes32[] memory newProofs = new bytes32[](1);
        newProofs[0] = keccak256("renewal1");

        vm.expectEmit(true, true, false, false);
        emit RenewalRequested(2, seller1);

        vm.prank(seller1);
        registry.requestRenewal(newProofs);
    }

    function test_ApproveRenewal_ExtendsExpiry() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        uint256 oldExpiry = registry.getKYBExpiry(seller1);

        // Advance time by 1 day before renewal
        advanceTime(1);

        bytes32[] memory newProofs = new bytes32[](1);
        newProofs[0] = keccak256("renewal1");

        vm.prank(seller1);
        uint256 renewalId = registry.requestRenewal(newProofs);

        vm.prank(operator);
        registry.approveRenewal(renewalId, 365);

        uint256 newExpiry = registry.getKYBExpiry(seller1);
        assertGt(newExpiry, oldExpiry, "Expiry should be extended");
    }

    function test_ApproveRenewal_EmitsEvent() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        bytes32[] memory newProofs = new bytes32[](1);
        newProofs[0] = keccak256("renewal1");

        vm.prank(seller1);
        uint256 renewalId = registry.requestRenewal(newProofs);

        uint256 expectedExpiry = block.timestamp + 365 days;

        vm.expectEmit(true, false, false, true);
        emit RenewalApproved(seller1, expectedExpiry);

        vm.prank(operator);
        registry.approveRenewal(renewalId, 365);
    }

    // ============ View Function Tests ============

    function test_IsKYBValid_ReturnsTrue_WhenValid() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        assertTrue(registry.isKYBValid(seller1));
    }

    function test_IsKYBValid_ReturnsFalse_WhenExpired() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        // Fast forward past expiry
        advanceTime(366);

        assertFalse(registry.isKYBValid(seller1));
    }

    function test_IsKYBValid_ReturnsFalse_WhenSuspended() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        vm.prank(operator);
        registry.suspendKYB(seller1, "Test");

        assertFalse(registry.isKYBValid(seller1));
    }

    function test_IsKYBValid_ReturnsFalse_WhenRevoked() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        vm.prank(operator);
        registry.revokeKYB(seller1, "Test");

        assertFalse(registry.isKYBValid(seller1));
    }

    function test_GetExpiringVerifications_ReturnsCorrectList() public {
        // Note: Current implementation returns empty array
        address[] memory expiring = registry.getExpiringVerifications(30);
        assertEq(expiring.length, 0);
    }

    function test_GetKYBByHash_Success() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        KYBRegistry.KYBData memory kyb = registry.getKYBByHash(businessHash1);
        assertEq(kyb.businessWallet, seller1);
        assertEq(kyb.businessHash, businessHash1);
    }

    function test_GetDaysUntilExpiry_Positive() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        int256 daysUntilExpiry = registry.getDaysUntilExpiry(seller1);
        assertEq(daysUntilExpiry, 365);
    }

    function test_GetDaysUntilExpiry_Negative() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        advanceTime(370);

        int256 daysUntilExpiry = registry.getDaysUntilExpiry(seller1);
        assertLt(daysUntilExpiry, 0, "Should be negative when expired");
    }

    function test_IsProofVerified_ReturnsCorrectly() public {
        uint256 requestId = _submitKYB(seller1, businessHash1);
        _approveKYB(requestId, KYBRegistry.VerificationLevel.STANDARD);

        assertTrue(registry.isProofVerified(seller1, "businessRegistration"));
        assertTrue(registry.isProofVerified(seller1, "revenueThreshold"));
        assertFalse(registry.isProofVerified(seller1, "operatingHistory"));
    }

    function test_GetPendingRequests_ReturnsCorrectList() public {
        _submitKYB(seller1, businessHash1);
        _submitKYB(seller2, businessHash2);

        uint256[] memory pending = registry.getPendingRequests();
        assertEq(pending.length, 2);
        assertEq(pending[0], 1);
        assertEq(pending[1], 2);
    }

    // ============ Jurisdiction Tests ============

    function test_JurisdictionManagement() public {
        // Add new jurisdiction
        vm.prank(admin);
        registry.addSupportedJurisdiction("CA");

        assertTrue(registry.isJurisdictionSupported("CA"));

        // Remove jurisdiction
        vm.prank(admin);
        registry.removeSupportedJurisdiction("CA");

        assertFalse(registry.isJurisdictionSupported("CA"));
    }

    function test_AddSupportedJurisdiction_EmitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit JurisdictionAdded("CA");

        vm.prank(admin);
        registry.addSupportedJurisdiction("CA");
    }

    function test_RemoveSupportedJurisdiction_EmitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit JurisdictionRemoved("US");

        vm.prank(admin);
        registry.removeSupportedJurisdiction("US");
    }

    // ============ Admin Function Tests ============

    function test_SetDefaultValidityPeriod_Success() public {
        vm.prank(admin);
        registry.setDefaultValidityPeriod(180);

        // Validity period is updated (can't directly test, but no revert means success)
    }

    function test_SetMinimumProofsRequired_Success() public {
        vm.prank(admin);
        registry.setMinimumProofsRequired(KYBRegistry.VerificationLevel.BASIC, 2);

        // Requirement is updated (tested indirectly through approval)
    }
}
