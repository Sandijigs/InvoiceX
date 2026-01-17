// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Import base contracts
import "../test/mocks/MockUSDT.sol";
import "../src/core/InvoiceToken.sol";
import "../src/core/BusinessRegistry.sol";
import "../src/core/BuyerRegistry.sol";
import "../src/compliance/KYBRegistry.sol";

/**
 * @title DeployStep1
 * @notice Deploy base contracts first
 */
contract DeployStep1 is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address admin = deployer; // Use deployer as admin for simplicity

        console.log("=== InvoiceX Deployment Step 1: Base Contracts ===");
        console.log("Deployer/Admin:", deployer);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock USDT
        console.log("1/5: Deploying MockUSDT...");
        MockUSDT usdt = new MockUSDT();
        console.log("   MockUSDT deployed at:", address(usdt));
        usdt.mint(deployer, 10_000_000 * 1e6); // Mint 10M USDT
        console.log("   Minted 10M USDT to deployer");

        // 2. Deploy InvoiceToken
        console.log("2/5: Deploying InvoiceToken...");
        InvoiceToken invoiceToken = new InvoiceToken();
        console.log("   InvoiceToken deployed at:", address(invoiceToken));

        // 3. Deploy BusinessRegistry
        console.log("3/5: Deploying BusinessRegistry...");
        BusinessRegistry businessRegistry = new BusinessRegistry();
        console.log("   BusinessRegistry deployed at:", address(businessRegistry));

        // 4. Deploy BuyerRegistry
        console.log("4/5: Deploying BuyerRegistry...");
        BuyerRegistry buyerRegistry = new BuyerRegistry();
        console.log("   BuyerRegistry deployed at:", address(buyerRegistry));

        // 5. Deploy KYBRegistry
        console.log("5/5: Deploying KYBRegistry...");
        KYBRegistry kybRegistry = new KYBRegistry(admin);
        console.log("   KYBRegistry deployed at:", address(kybRegistry));

        vm.stopBroadcast();

        // Save addresses to file for next step
        string memory addresses = string.concat(
            "STABLECOIN_ADDRESS=", vm.toString(address(usdt)), "\n",
            "INVOICE_TOKEN_ADDRESS=", vm.toString(address(invoiceToken)), "\n",
            "BUSINESS_REGISTRY_ADDRESS=", vm.toString(address(businessRegistry)), "\n",
            "BUYER_REGISTRY_ADDRESS=", vm.toString(address(buyerRegistry)), "\n",
            "KYB_REGISTRY_ADDRESS=", vm.toString(address(kybRegistry)), "\n"
        );

        console.log("");
        console.log("=== Step 1 Complete ===");
        console.log("Addresses to add to .env:");
        console.log(addresses);
    }
}