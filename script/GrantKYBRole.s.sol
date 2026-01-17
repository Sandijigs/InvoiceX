// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/compliance/KYBRegistry.sol";

contract GrantKYBRoleScript is Script {
    // Contract address from deployments
    address constant KYB_REGISTRY = 0x7d6FfE6Bae45120cdf907026A6757DbE633d7a50;

    // Admin wallet that needs the role
    address constant ADMIN = 0xeEA4353FE0641fA7730e1c9Bc7cC0f969Ecd5914;

    function run() external {
        // Start broadcasting transactions
        vm.startBroadcast();

        KYBRegistry kybRegistry = KYBRegistry(KYB_REGISTRY);

        // Grant KYB_VERIFIER_ROLE to admin
        bytes32 verifierRole = kybRegistry.KYB_VERIFIER_ROLE();
        kybRegistry.grantRole(verifierRole, ADMIN);

        console.log("Granted KYB_VERIFIER_ROLE to:", ADMIN);
        console.log("On KYBRegistry:", address(kybRegistry));

        vm.stopBroadcast();
    }
}
