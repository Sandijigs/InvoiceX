// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/compliance/KYBRegistry.sol";

contract CheckKYBRequestScript is Script {
    address constant KYB_REGISTRY = 0x7d6FfE6Bae45120cdf907026A6757DbE633d7a50;

    function run() external view {
        KYBRegistry kybRegistry = KYBRegistry(KYB_REGISTRY);

        console.log("=== KYB Registry Diagnostics ===");
        console.log("Contract:", address(kybRegistry));
        console.log("");

        // Check pending requests
        console.log("Checking pending requests...");
        uint256[] memory pendingIds = kybRegistry.getPendingRequests();
        console.log("Total pending requests:", pendingIds.length);

        for (uint256 i = 0; i < pendingIds.length; i++) {
            console.log("");
            console.log("--- Pending Request", i + 1, "---");
            uint256 requestId = pendingIds[i];
            console.log("Request ID:", requestId);

            try kybRegistry.getVerificationRequest(requestId) returns (
                uint256 _requestId,
                address businessWallet,
                bytes32 businessHash,
                bytes32[] memory submittedProofs,
                uint256 requestedAt,
                uint8 requestStatus,
                string memory rejectionReason
            ) {
                console.log("Business Wallet:", businessWallet);
                console.log("Submitted Proofs:", submittedProofs.length);
                console.log("Request Status:", requestStatus); // 0=PENDING, 1=APPROVED, 2=REJECTED
                console.log("Requested At:", requestedAt);
            } catch {
                console.log("ERROR: Could not fetch request details");
            }
        }

        console.log("");
        console.log("=== Verification Level Requirements ===");
        console.log("BASIC (0): 1 proof minimum");
        console.log("STANDARD (2): 3 proofs minimum");
        console.log("ENHANCED (3): 5 proofs minimum");
    }
}
