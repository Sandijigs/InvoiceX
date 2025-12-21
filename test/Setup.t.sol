// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TestHelper} from "./helpers/TestHelper.sol";

/**
 * @title SetupTest
 * @notice Verify that the test environment is properly configured
 */
contract SetupTest is TestHelper {
    function setUp() public override {
        super.setUp();
    }

    function test_SetupComplete() public view {
        // Verify test accounts are created
        assertEq(admin != address(0), true, "Admin address should be set");
        assertEq(seller1 != address(0), true, "Seller1 address should be set");
        assertEq(investor1 != address(0), true, "Investor1 address should be set");
    }

    function test_Constants() public pure {
        // Verify constants are defined correctly
        assertEq(DECIMALS, 6, "USDT should have 6 decimals");
        assertEq(ONE_USDT, 1e6, "One USDT should equal 1e6");
        assertEq(THOUSAND_USDT, 1_000e6, "Thousand USDT should equal 1_000e6");
        assertEq(BPS_DENOMINATOR, 10_000, "Basis points denominator should be 10,000");
    }

    function test_HelperFunctions() public {
        // Test buyer hash generation
        bytes32 buyerHash = generateBuyerHash("TestBuyer");
        assertEq(buyerHash, keccak256(abi.encodePacked("TestBuyer")), "Buyer hash should match");

        // Test advance amount calculation
        uint256 advanceAmount = calculateAdvanceAmount(TEN_THOUSAND_USDT, ADVANCE_RATE_TIER_A);
        assertEq(advanceAmount, 9_200e6, "Advance amount should be 92% of face value");

        // Test protocol fee calculation
        uint256 protocolFee = calculateProtocolFee(advanceAmount, PROTOCOL_FEE_BPS);
        assertEq(protocolFee, 92e6, "Protocol fee should be 1% of advance amount");
    }

    function test_TimeHelpers() public {
        // Set a known timestamp
        vm.warp(1000);

        // Advance time by 30 days
        advanceTime(30);

        assertEq(
            block.timestamp,
            1000 + (30 * SECONDS_PER_DAY),
            "Time should advance by 30 days"
        );
    }

    function test_InvoiceNumberGeneration() public pure {
        string memory invoiceNumber = generateInvoiceNumber(1);
        assertEq(
            keccak256(bytes(invoiceNumber)),
            keccak256(bytes("INV-2025-1")),
            "Invoice number should be formatted correctly"
        );
    }
}