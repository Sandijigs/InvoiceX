// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TestHelper} from "../helpers/TestHelper.sol";
import {InvoiceToken} from "../../src/core/InvoiceToken.sol";

/**
 * @title InvoiceTokenTest
 * @notice Comprehensive tests for InvoiceToken contract
 */
contract InvoiceTokenTest is TestHelper {
    InvoiceToken public invoiceToken;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // Events to test
    event InvoiceMinted(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 faceValue,
        uint256 dueDate
    );

    event InvoiceStatusUpdated(
        uint256 indexed tokenId,
        InvoiceToken.InvoiceStatus oldStatus,
        InvoiceToken.InvoiceStatus newStatus
    );

    event InvoiceFunded(uint256 indexed tokenId, uint256 advanceAmount, uint256 feeAmount);

    event InvoicePaymentReceived(uint256 indexed tokenId, uint256 amount);

    event InvoiceBurned(uint256 indexed tokenId);

    function setUp() public override {
        super.setUp();

        // Deploy InvoiceToken
        vm.prank(admin);
        invoiceToken = new InvoiceToken();

        // Grant roles
        vm.startPrank(admin);
        invoiceToken.setMinter(operator, true);
        invoiceToken.grantRole(UPDATER_ROLE, operator);
        invoiceToken.grantRole(BURNER_ROLE, operator);
        vm.stopPrank();
    }

    // ============ Helper Functions ============

    function _createValidInvoiceData() internal view returns (InvoiceToken.InvoiceData memory) {
        return
            InvoiceToken.InvoiceData({
                invoiceId: 0,
                seller: seller1,
                buyerHash: generateBuyerHash("TestBuyer"),
                invoiceNumber: "INV-2025-001",
                faceValue: TEN_THOUSAND_USDT,
                advanceAmount: 0,
                feeAmount: 0,
                issuedAt: block.timestamp,
                dueDate: block.timestamp + 30 days,
                fundedAt: 0,
                paidAt: 0,
                riskScore: 20,
                riskTier: InvoiceToken.RiskTier.TIER_A,
                documentHash: generateDocumentHash("QmTest123"),
                status: InvoiceToken.InvoiceStatus.PENDING_VERIFICATION
            });
    }

    function _mintInvoice() internal returns (uint256) {
        InvoiceToken.InvoiceData memory data = _createValidInvoiceData();

        vm.prank(operator);
        return invoiceToken.mint(seller1, data);
    }

    // ============ Constructor Tests ============

    function test_Constructor_SetsCorrectName() public view {
        assertEq(invoiceToken.name(), "InvoiceX Token");
    }

    function test_Constructor_SetsCorrectSymbol() public view {
        assertEq(invoiceToken.symbol(), "INVX");
    }

    function test_Constructor_GrantsAdminRole() public view {
        assertTrue(invoiceToken.hasRole(invoiceToken.DEFAULT_ADMIN_ROLE(), admin));
    }

    // ============ Mint Tests ============

    function test_Mint_Success() public {
        InvoiceToken.InvoiceData memory data = _createValidInvoiceData();

        vm.prank(operator);
        uint256 tokenId = invoiceToken.mint(seller1, data);

        assertEq(tokenId, 1, "Token ID should be 1");
        assertEq(invoiceToken.ownerOf(tokenId), seller1, "Owner should be seller1");

        InvoiceToken.InvoiceData memory stored = invoiceToken.getInvoice(tokenId);
        assertEq(stored.seller, seller1, "Seller should match");
        assertEq(stored.faceValue, TEN_THOUSAND_USDT, "Face value should match");
        assertEq(
            uint8(stored.status),
            uint8(InvoiceToken.InvoiceStatus.PENDING_VERIFICATION),
            "Status should be PENDING_VERIFICATION"
        );
    }

    function test_Mint_EmitsInvoiceMinted() public {
        InvoiceToken.InvoiceData memory data = _createValidInvoiceData();

        vm.expectEmit(true, true, false, true);
        emit InvoiceMinted(1, seller1, TEN_THOUSAND_USDT, data.dueDate);

        vm.prank(operator);
        invoiceToken.mint(seller1, data);
    }

    function test_Mint_RevertWhen_InvalidData_ZeroAddress() public {
        InvoiceToken.InvoiceData memory data = _createValidInvoiceData();

        vm.prank(operator);
        vm.expectRevert(InvoiceToken.ZeroAddress.selector);
        invoiceToken.mint(address(0), data);
    }

    function test_Mint_RevertWhen_NotMinter() public {
        InvoiceToken.InvoiceData memory data = _createValidInvoiceData();

        vm.prank(seller1);
        vm.expectRevert();
        invoiceToken.mint(seller1, data);
    }

    function test_Mint_RevertWhen_ZeroSeller() public {
        InvoiceToken.InvoiceData memory data = _createValidInvoiceData();
        data.seller = address(0);

        vm.prank(operator);
        vm.expectRevert(InvoiceToken.ZeroAddress.selector);
        invoiceToken.mint(seller1, data);
    }

    function test_Mint_RevertWhen_ZeroFaceValue() public {
        InvoiceToken.InvoiceData memory data = _createValidInvoiceData();
        data.faceValue = 0;

        vm.prank(operator);
        vm.expectRevert(InvoiceToken.InvalidAmount.selector);
        invoiceToken.mint(seller1, data);
    }

    function test_Mint_RevertWhen_PastDueDate() public {
        vm.warp(1000 days); // Set a known time
        InvoiceToken.InvoiceData memory data = _createValidInvoiceData();
        data.dueDate = block.timestamp - 1 days;

        vm.prank(operator);
        vm.expectRevert(InvoiceToken.InvalidDueDate.selector);
        invoiceToken.mint(seller1, data);
    }

    function test_Mint_MultipleInvoices() public {
        for (uint256 i = 0; i < 5; i++) {
            uint256 tokenId = _mintInvoice();
            assertEq(tokenId, i + 1, "Token IDs should increment");
        }
    }

    // ============ Update Status Tests ============

    function test_UpdateStatus_Success() public {
        uint256 tokenId = _mintInvoice();

        vm.prank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.VERIFIED);

        InvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(tokenId);
        assertEq(
            uint8(invoice.status),
            uint8(InvoiceToken.InvoiceStatus.VERIFIED),
            "Status should be updated"
        );
    }

    function test_UpdateStatus_EmitsStatusUpdated() public {
        uint256 tokenId = _mintInvoice();

        vm.expectEmit(true, false, false, true);
        emit InvoiceStatusUpdated(
            tokenId,
            InvoiceToken.InvoiceStatus.PENDING_VERIFICATION,
            InvoiceToken.InvoiceStatus.VERIFIED
        );

        vm.prank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.VERIFIED);
    }

    function test_UpdateStatus_RevertWhen_InvalidTransition() public {
        uint256 tokenId = _mintInvoice();

        // Try to go directly to FUNDED without going through VERIFIED first
        vm.prank(operator);
        vm.expectRevert(InvoiceToken.InvalidStatusTransition.selector);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.FUNDED);
    }

    function test_UpdateStatus_RevertWhen_InvoiceNotFound() public {
        vm.prank(operator);
        vm.expectRevert(InvoiceToken.InvoiceNotFound.selector);
        invoiceToken.updateStatus(999, InvoiceToken.InvoiceStatus.VERIFIED);
    }

    function test_UpdateStatus_ValidTransitionSequence() public {
        uint256 tokenId = _mintInvoice();

        vm.startPrank(operator);

        // PENDING_VERIFICATION -> VERIFIED
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.VERIFIED);

        // VERIFIED -> FUNDING_REQUESTED
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.FUNDING_REQUESTED);

        // FUNDING_REQUESTED -> FUNDED
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.FUNDED);

        // FUNDED -> PAYMENT_RECEIVED
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.PAYMENT_RECEIVED);

        // PAYMENT_RECEIVED -> SETTLED
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.SETTLED);

        vm.stopPrank();

        InvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(tokenId);
        assertEq(
            uint8(invoice.status),
            uint8(InvoiceToken.InvoiceStatus.SETTLED),
            "Status should be SETTLED"
        );
    }

    // ============ Record Funding Tests ============

    function test_RecordFunding_Success() public {
        uint256 tokenId = _mintInvoice();

        // Set status to FUNDING_REQUESTED
        vm.startPrank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.VERIFIED);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.FUNDING_REQUESTED);

        uint256 advanceAmount = 9_000e6;
        uint256 feeAmount = 100e6;

        invoiceToken.recordFunding(tokenId, advanceAmount, feeAmount);
        vm.stopPrank();

        InvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(tokenId);
        assertEq(invoice.advanceAmount, advanceAmount, "Advance amount should match");
        assertEq(invoice.feeAmount, feeAmount, "Fee amount should match");
        assertGt(invoice.fundedAt, 0, "Funded at should be set");
        assertEq(
            uint8(invoice.status),
            uint8(InvoiceToken.InvoiceStatus.FUNDED),
            "Status should be FUNDED"
        );
    }

    function test_RecordFunding_EmitsFunded() public {
        uint256 tokenId = _mintInvoice();

        vm.startPrank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.VERIFIED);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.FUNDING_REQUESTED);

        uint256 advanceAmount = 9_000e6;
        uint256 feeAmount = 100e6;

        vm.expectEmit(true, false, false, true);
        emit InvoiceFunded(tokenId, advanceAmount, feeAmount);

        invoiceToken.recordFunding(tokenId, advanceAmount, feeAmount);
        vm.stopPrank();
    }

    function test_RecordFunding_RevertWhen_AlreadyFunded() public {
        uint256 tokenId = _mintInvoice();

        vm.startPrank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.VERIFIED);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.FUNDING_REQUESTED);

        invoiceToken.recordFunding(tokenId, 9_000e6, 100e6);

        // Try to fund again
        vm.expectRevert(InvoiceToken.InvoiceAlreadyFunded.selector);
        invoiceToken.recordFunding(tokenId, 9_000e6, 100e6);
        vm.stopPrank();
    }

    function test_RecordFunding_RevertWhen_ZeroAmount() public {
        uint256 tokenId = _mintInvoice();

        vm.startPrank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.VERIFIED);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.FUNDING_REQUESTED);

        vm.expectRevert(InvoiceToken.InvalidAmount.selector);
        invoiceToken.recordFunding(tokenId, 0, 100e6);
        vm.stopPrank();
    }

    // ============ Record Payment Tests ============

    function test_RecordPayment_Success() public {
        uint256 tokenId = _mintInvoice();

        vm.startPrank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.VERIFIED);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.FUNDING_REQUESTED);
        invoiceToken.recordFunding(tokenId, 9_000e6, 100e6);

        uint256 paymentAmount = TEN_THOUSAND_USDT;
        invoiceToken.recordPayment(tokenId, paymentAmount);
        vm.stopPrank();

        InvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(tokenId);
        assertGt(invoice.paidAt, 0, "Paid at should be set");
        assertEq(
            uint8(invoice.status),
            uint8(InvoiceToken.InvoiceStatus.PAYMENT_RECEIVED),
            "Status should be PAYMENT_RECEIVED"
        );
    }

    function test_RecordPayment_EmitsPaymentReceived() public {
        uint256 tokenId = _mintInvoice();

        vm.startPrank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.VERIFIED);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.FUNDING_REQUESTED);
        invoiceToken.recordFunding(tokenId, 9_000e6, 100e6);

        uint256 paymentAmount = TEN_THOUSAND_USDT;

        vm.expectEmit(true, false, false, true);
        emit InvoicePaymentReceived(tokenId, paymentAmount);

        invoiceToken.recordPayment(tokenId, paymentAmount);
        vm.stopPrank();
    }

    function test_RecordPayment_RevertWhen_NotFunded() public {
        uint256 tokenId = _mintInvoice();

        vm.prank(operator);
        vm.expectRevert(InvoiceToken.InvoiceNotFunded.selector);
        invoiceToken.recordPayment(tokenId, TEN_THOUSAND_USDT);
    }

    function test_RecordPayment_RevertWhen_ZeroAmount() public {
        uint256 tokenId = _mintInvoice();

        vm.startPrank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.VERIFIED);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.FUNDING_REQUESTED);
        invoiceToken.recordFunding(tokenId, 9_000e6, 100e6);

        vm.expectRevert(InvoiceToken.InvalidAmount.selector);
        invoiceToken.recordPayment(tokenId, 0);
        vm.stopPrank();
    }

    // ============ Burn Tests ============

    function test_Burn_Success_WhenSettled() public {
        uint256 tokenId = _mintInvoice();

        // Move to SETTLED status
        vm.startPrank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.VERIFIED);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.FUNDING_REQUESTED);
        invoiceToken.recordFunding(tokenId, 9_000e6, 100e6);
        invoiceToken.recordPayment(tokenId, TEN_THOUSAND_USDT);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.SETTLED);

        invoiceToken.burn(tokenId);
        vm.stopPrank();

        // Token should no longer exist - ERC721 reverts with ERC721NonexistentToken
        vm.expectRevert();
        invoiceToken.ownerOf(tokenId);
    }

    function test_Burn_Success_WhenCancelled() public {
        uint256 tokenId = _mintInvoice();

        vm.startPrank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.CANCELLED);
        invoiceToken.burn(tokenId);
        vm.stopPrank();

        // Token should no longer exist - ERC721 reverts with ERC721NonexistentToken
        vm.expectRevert();
        invoiceToken.ownerOf(tokenId);
    }

    function test_Burn_EmitsBurned() public {
        uint256 tokenId = _mintInvoice();

        vm.startPrank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.CANCELLED);

        vm.expectEmit(true, false, false, false);
        emit InvoiceBurned(tokenId);

        invoiceToken.burn(tokenId);
        vm.stopPrank();
    }

    function test_Burn_RevertWhen_Active() public {
        uint256 tokenId = _mintInvoice();

        vm.prank(operator);
        vm.expectRevert(InvoiceToken.InvoiceNotBurnable.selector);
        invoiceToken.burn(tokenId);
    }

    function test_Burn_SuccessWhen_Owner() public {
        uint256 tokenId = _mintInvoice();

        vm.prank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.CANCELLED);

        // Owner can burn
        vm.prank(seller1);
        invoiceToken.burn(tokenId);
    }

    // ============ View Function Tests ============

    function test_GetInvoicesByOwner_ReturnsCorrectList() public {
        uint256 tokenId1 = _mintInvoice();
        uint256 tokenId2 = _mintInvoice();
        uint256 tokenId3 = _mintInvoice();

        uint256[] memory invoices = invoiceToken.getInvoicesByOwner(seller1);

        assertEq(invoices.length, 3, "Should have 3 invoices");
        assertEq(invoices[0], tokenId1);
        assertEq(invoices[1], tokenId2);
        assertEq(invoices[2], tokenId3);
    }

    function test_GetInvoicesBySeller_ReturnsCorrectList() public {
        _mintInvoice();
        _mintInvoice();
        _mintInvoice();

        uint256[] memory invoices = invoiceToken.getInvoicesBySeller(seller1);
        assertEq(invoices.length, 3, "Should have 3 invoices for seller1");
    }

    function test_GetInvoicesByStatus_ReturnsCorrectList() public {
        uint256 tokenId1 = _mintInvoice();
        _mintInvoice();

        // Move one to VERIFIED
        vm.prank(operator);
        invoiceToken.updateStatus(tokenId1, InvoiceToken.InvoiceStatus.VERIFIED);

        uint256[] memory pending = invoiceToken.getInvoicesByStatus(
            InvoiceToken.InvoiceStatus.PENDING_VERIFICATION
        );
        uint256[] memory verified = invoiceToken.getInvoicesByStatus(
            InvoiceToken.InvoiceStatus.VERIFIED
        );

        assertEq(pending.length, 1, "Should have 1 pending invoice");
        assertEq(verified.length, 1, "Should have 1 verified invoice");
    }

    function test_IsInvoiceActive_ReturnsTrueWhenActive() public {
        uint256 tokenId = _mintInvoice();

        assertTrue(invoiceToken.isInvoiceActive(tokenId), "Should be active");
    }

    function test_IsInvoiceActive_ReturnsFalseWhenSettled() public {
        uint256 tokenId = _mintInvoice();

        vm.startPrank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.VERIFIED);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.FUNDING_REQUESTED);
        invoiceToken.recordFunding(tokenId, 9_000e6, 100e6);
        invoiceToken.recordPayment(tokenId, TEN_THOUSAND_USDT);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.SETTLED);
        vm.stopPrank();

        assertFalse(invoiceToken.isInvoiceActive(tokenId), "Should not be active");
    }

    function test_GetDaysUntilDue_Positive() public {
        uint256 tokenId = _mintInvoice();

        int256 daysUntilDue = invoiceToken.getDaysUntilDue(tokenId);
        assertEq(daysUntilDue, 30, "Should be 30 days until due");
    }

    function test_GetDaysUntilDue_Negative() public {
        uint256 tokenId = _mintInvoice();

        // Advance time past due date
        advanceTime(35);

        int256 daysUntilDue = invoiceToken.getDaysUntilDue(tokenId);
        assertLt(daysUntilDue, 0, "Should be negative (past due)");
        assertEq(daysUntilDue, -5, "Should be 5 days overdue");
    }

    function test_GetDaysOverdue_Zero() public {
        uint256 tokenId = _mintInvoice();

        uint256 daysOverdue = invoiceToken.getDaysOverdue(tokenId);
        assertEq(daysOverdue, 0, "Should not be overdue");
    }

    function test_GetDaysOverdue_Positive() public {
        uint256 tokenId = _mintInvoice();

        // Advance time past due date
        advanceTime(35);

        uint256 daysOverdue = invoiceToken.getDaysOverdue(tokenId);
        assertEq(daysOverdue, 5, "Should be 5 days overdue");
    }

    // ============ Transfer Tests ============

    function test_Transfer_Success() public {
        uint256 tokenId = _mintInvoice();

        vm.prank(seller1);
        invoiceToken.transferFrom(seller1, seller2, tokenId);

        assertEq(invoiceToken.ownerOf(tokenId), seller2, "Owner should be seller2");
    }

    // ============ Admin Function Tests ============

    function test_SetMinter_Success() public {
        vm.prank(admin);
        invoiceToken.setMinter(seller1, true);

        assertTrue(invoiceToken.hasRole(MINTER_ROLE, seller1), "Should have MINTER_ROLE");
    }

    function test_SetMinter_Revoke() public {
        vm.startPrank(admin);
        invoiceToken.setMinter(seller1, true);
        invoiceToken.setMinter(seller1, false);
        vm.stopPrank();

        assertFalse(invoiceToken.hasRole(MINTER_ROLE, seller1), "Should not have MINTER_ROLE");
    }

    function test_SetMinter_RevertWhen_ZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(InvoiceToken.ZeroAddress.selector);
        invoiceToken.setMinter(address(0), true);
    }

    function test_SetUpdater_Success() public {
        vm.prank(admin);
        invoiceToken.setUpdater(seller1, true);

        assertTrue(invoiceToken.hasRole(UPDATER_ROLE, seller1), "Should have UPDATER_ROLE");
    }

    function test_SetUpdater_Revoke() public {
        vm.startPrank(admin);
        invoiceToken.setUpdater(seller1, true);
        invoiceToken.setUpdater(seller1, false);
        vm.stopPrank();

        assertFalse(invoiceToken.hasRole(UPDATER_ROLE, seller1), "Should not have UPDATER_ROLE");
    }

    function test_SetUpdater_RevertWhen_ZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(InvoiceToken.ZeroAddress.selector);
        invoiceToken.setUpdater(address(0), true);
    }

    // ============ Edge Cases ============

    function test_GetInvoice_RevertWhen_NotFound() public {
        vm.expectRevert(InvoiceToken.InvoiceNotFound.selector);
        invoiceToken.getInvoice(999);
    }

    function test_StatusTransitions_CannotGoBackwards() public {
        uint256 tokenId = _mintInvoice();

        vm.startPrank(operator);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.VERIFIED);

        // Try to go back to PENDING_VERIFICATION
        vm.expectRevert(InvoiceToken.InvalidStatusTransition.selector);
        invoiceToken.updateStatus(tokenId, InvoiceToken.InvoiceStatus.PENDING_VERIFICATION);
        vm.stopPrank();
    }

    function test_MultipleStatusUpdates_MaintainsStatusList() public {
        uint256 tokenId1 = _mintInvoice();
        uint256 tokenId2 = _mintInvoice();

        vm.startPrank(operator);

        // Update token1 to VERIFIED
        invoiceToken.updateStatus(tokenId1, InvoiceToken.InvoiceStatus.VERIFIED);

        // Check status lists
        uint256[] memory pending = invoiceToken.getInvoicesByStatus(
            InvoiceToken.InvoiceStatus.PENDING_VERIFICATION
        );
        uint256[] memory verified = invoiceToken.getInvoicesByStatus(
            InvoiceToken.InvoiceStatus.VERIFIED
        );

        assertEq(pending.length, 1, "Should have 1 pending");
        assertEq(verified.length, 1, "Should have 1 verified");
        assertEq(pending[0], tokenId2, "Pending should be tokenId2");
        assertEq(verified[0], tokenId1, "Verified should be tokenId1");

        vm.stopPrank();
    }
}