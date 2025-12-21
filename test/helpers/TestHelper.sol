// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

/**
 * @title TestHelper
 * @notice Base contract for all InvoiceX tests
 * @dev Provides common test utilities, constants, and helper functions
 */
contract TestHelper is Test {
    // ============ Time Constants ============
    uint256 constant SECONDS_PER_DAY = 86_400;
    uint256 constant SECONDS_PER_WEEK = SECONDS_PER_DAY * 7;
    uint256 constant SECONDS_PER_MONTH = SECONDS_PER_DAY * 30;

    // ============ Token Constants ============
    uint8 constant DECIMALS = 6; // USDT has 6 decimals
    uint256 constant ONE_USDT = 1e6;
    uint256 constant HUNDRED_USDT = 100e6;
    uint256 constant THOUSAND_USDT = 1_000e6;
    uint256 constant TEN_THOUSAND_USDT = 10_000e6;
    uint256 constant MILLION_USDT = 1_000_000e6;

    // ============ Invoice Constants ============
    uint256 constant MIN_INVOICE_AMOUNT = 1_000e6;
    uint256 constant MAX_INVOICE_AMOUNT = 1_000_000e6;
    uint256 constant MIN_PAYMENT_TERMS = 7; // days
    uint256 constant MAX_PAYMENT_TERMS = 120; // days

    // ============ Risk Tiers and Scores ============
    uint256 constant RISK_SCORE_TIER_A_MAX = 25;
    uint256 constant RISK_SCORE_TIER_B_MAX = 50;
    uint256 constant RISK_SCORE_TIER_C_MAX = 75;

    // ============ Advance Rates (Basis Points) ============
    uint256 constant BPS_DENOMINATOR = 10_000;
    uint256 constant ADVANCE_RATE_TIER_A = 9_200; // 92%
    uint256 constant ADVANCE_RATE_TIER_B = 8_700; // 87%
    uint256 constant ADVANCE_RATE_TIER_C = 8_000; // 80%

    // ============ Fee Constants (Basis Points) ============
    uint256 constant PROTOCOL_FEE_BPS = 100; // 1%
    uint256 constant MANAGEMENT_FEE_BPS = 50; // 0.5%
    uint256 constant PERFORMANCE_FEE_BPS = 1_000; // 10%
    uint256 constant LATE_FEE_RATE_BPS = 10; // 0.1% daily

    // ============ Grace Period ============
    uint256 constant GRACE_PERIOD_DAYS = 5;

    // ============ Test Addresses ============
    address constant ZERO_ADDRESS = address(0);
    address constant DEAD_ADDRESS = address(0xdEaD);

    // ============ Common Test Actors ============
    address payable admin;
    address payable operator;
    address payable seller1;
    address payable seller2;
    address payable investor1;
    address payable investor2;
    address payable buyer1;
    address payable buyer2;
    address payable oracle;
    address payable treasury;

    // ============ Setup Function ============
    function setUp() public virtual {
        // Create test accounts
        admin = payable(makeAddr("admin"));
        operator = payable(makeAddr("operator"));
        seller1 = payable(makeAddr("seller1"));
        seller2 = payable(makeAddr("seller2"));
        investor1 = payable(makeAddr("investor1"));
        investor2 = payable(makeAddr("investor2"));
        buyer1 = payable(makeAddr("buyer1"));
        buyer2 = payable(makeAddr("buyer2"));
        oracle = payable(makeAddr("oracle"));
        treasury = payable(makeAddr("treasury"));

        // Fund accounts with ETH
        vm.deal(admin, 100 ether);
        vm.deal(operator, 100 ether);
        vm.deal(seller1, 10 ether);
        vm.deal(seller2, 10 ether);
        vm.deal(investor1, 100 ether);
        vm.deal(investor2, 100 ether);
        vm.deal(oracle, 1 ether);
        vm.deal(treasury, 1 ether);

        // Label addresses for better trace output
        vm.label(admin, "Admin");
        vm.label(operator, "Operator");
        vm.label(seller1, "Seller1");
        vm.label(seller2, "Seller2");
        vm.label(investor1, "Investor1");
        vm.label(investor2, "Investor2");
        vm.label(buyer1, "Buyer1");
        vm.label(buyer2, "Buyer2");
        vm.label(oracle, "Oracle");
        vm.label(treasury, "Treasury");
    }

    // ============ Helper Functions ============

    /**
     * @notice Advance blockchain time by specified number of days
     */
    function advanceTime(uint256 numDays) internal {
        vm.warp(block.timestamp + (numDays * SECONDS_PER_DAY));
    }

    /**
     * @notice Advance blockchain time by specified number of seconds
     */
    function advanceTimeSeconds(uint256 seconds_) internal {
        vm.warp(block.timestamp + seconds_);
    }

    /**
     * @notice Generate a buyer hash from a string identifier
     */
    function generateBuyerHash(string memory buyerName) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(buyerName));
    }

    /**
     * @notice Generate a document hash from content
     */
    function generateDocumentHash(string memory content) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(content));
    }

    /**
     * @notice Calculate advance amount from face value and rate
     */
    function calculateAdvanceAmount(
        uint256 faceValue,
        uint256 advanceRateBps
    ) internal pure returns (uint256) {
        return (faceValue * advanceRateBps) / BPS_DENOMINATOR;
    }

    /**
     * @notice Calculate protocol fee from advance amount
     */
    function calculateProtocolFee(
        uint256 advanceAmount,
        uint256 protocolFeeBps
    ) internal pure returns (uint256) {
        return (advanceAmount * protocolFeeBps) / BPS_DENOMINATOR;
    }

    /**
     * @notice Calculate net amount seller receives
     */
    function calculateNetAmount(
        uint256 faceValue,
        uint256 advanceRateBps,
        uint256 protocolFeeBps
    )
        internal
        pure
        returns (uint256 advanceAmount, uint256 protocolFee, uint256 netAmount)
    {
        advanceAmount = calculateAdvanceAmount(faceValue, advanceRateBps);
        protocolFee = calculateProtocolFee(advanceAmount, protocolFeeBps);
        netAmount = advanceAmount - protocolFee;
    }

    /**
     * @notice Calculate late fee based on days late
     */
    function calculateLateFee(uint256 amount, uint256 daysLate) internal pure returns (uint256) {
        return (amount * LATE_FEE_RATE_BPS * daysLate) / BPS_DENOMINATOR;
    }

    /**
     * @notice Generate an invoice number
     */
    function generateInvoiceNumber(uint256 index) internal pure returns (string memory) {
        return string(abi.encodePacked("INV-2025-", vm.toString(index)));
    }

    /**
     * @notice Expect a specific revert with custom error
     */
    function expectRevertWithCustomError(bytes4 selector) internal {
        vm.expectRevert(selector);
    }

    /**
     * @notice Get current block timestamp
     */
    function now_() internal view returns (uint256) {
        return block.timestamp;
    }

    /**
     * @notice Calculate due date from current time and payment terms
     */
    function calculateDueDate(uint256 paymentTermsDays) internal view returns (uint256) {
        return block.timestamp + (paymentTermsDays * SECONDS_PER_DAY);
    }

    /**
     * @notice Check if an invoice is overdue
     */
    function isOverdue(uint256 dueDate) internal view returns (bool) {
        return block.timestamp > dueDate;
    }

    /**
     * @notice Get random risk score for testing
     */
    function getRandomRiskScore(uint256 seed) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(seed))) % 100;
    }

    /**
     * @notice Get random amount within range
     */
    function getRandomAmount(
        uint256 seed,
        uint256 min,
        uint256 max
    ) internal pure returns (uint256) {
        return min + (uint256(keccak256(abi.encodePacked(seed))) % (max - min));
    }
}