// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Import only essential contracts for testing
import "../test/mocks/MockUSDT.sol";
import "../src/core/InvoiceToken.sol";

/**
 * @title QuickDeploy
 * @notice Minimal deployment script for testing
 */
contract QuickDeploy is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        console.log("=== Quick Deployment Test ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Mock USDT
        console.log("Deploying MockUSDT...");
        MockUSDT usdt = new MockUSDT();
        console.log("MockUSDT deployed at:", address(usdt));

        // Mint some tokens
        usdt.mint(vm.addr(deployerPrivateKey), 1_000_000 * 1e6);
        console.log("Minted 1M USDT to deployer");

        // Deploy InvoiceToken
        console.log("Deploying InvoiceToken...");
        InvoiceToken invoiceToken = new InvoiceToken();
        console.log("InvoiceToken deployed at:", address(invoiceToken));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Quick Deployment Complete ===");
        console.log("USDT:", address(usdt));
        console.log("InvoiceToken:", address(invoiceToken));
    }
}