// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

/**
 * @title VerifyInvoiceX
 * @notice Contract verification script for Etherscan/Block explorers
 * @dev Generates verification commands for all deployed contracts
 */
contract VerifyInvoiceX is Script {

    struct ContractInfo {
        string name;
        address addr;
        string[] constructorArgs;
    }

    ContractInfo[] public contracts;

    function run() external view {
        console.log("=== InvoiceX Contract Verification Script ===");
        console.log("");
        console.log("This script generates forge verify-contract commands");
        console.log("for all deployed InvoiceX protocol contracts.");
        console.log("");
        console.log("Prerequisites:");
        console.log("1. Set ETHERSCAN_API_KEY in .env");
        console.log("2. Ensure all contracts are deployed");
        console.log("3. Wait ~1 minute after deployment");
        console.log("");
        console.log("================================================");
        console.log("");

        _generateVerificationCommands();
    }

    function _generateVerificationCommands() internal view {
        // Load contract addresses from environment
        address invoiceToken = vm.envAddress("INVOICE_TOKEN_ADDRESS");
        address kybRegistry = vm.envAddress("KYB_REGISTRY_ADDRESS");
        address buyerRegistry = vm.envAddress("BUYER_REGISTRY_ADDRESS");
        address businessRegistry = vm.envAddress("BUSINESS_REGISTRY_ADDRESS");
        address creditOracle = vm.envAddress("CREDIT_ORACLE_ADDRESS");
        address liquidityPool = vm.envAddress("LIQUIDITY_POOL_ADDRESS");
        address yieldDistributor = vm.envAddress("YIELD_DISTRIBUTOR_ADDRESS");
        address insurancePool = vm.envAddress("INSURANCE_POOL_ADDRESS");
        address invoiceMarketplace = vm.envAddress("INVOICE_MARKETPLACE_ADDRESS");
        address invoiceXCore = vm.envAddress("INVOICEX_CORE_ADDRESS");

        // Get constructor arguments from environment
        address stablecoin = vm.envAddress("STABLECOIN_ADDRESS");
        address admin = vm.envAddress("ADMIN_ADDRESS");

        string memory rpcUrl = vm.envString("RPC_URL");
        string memory chain = vm.envOr("CHAIN_NAME", string("mantle-sepolia"));

        console.log("Network:", chain);
        console.log("RPC URL:", rpcUrl);
        console.log("");
        console.log("Run these commands to verify contracts:");
        console.log("================================================");
        console.log("");

        // 1. InvoiceToken
        console.log("# 1. InvoiceToken (no constructor args)");
        console.log("forge verify-contract \\");
        console.log("  --chain-id", vm.toString(block.chainid), "\\");
        console.log("  --watch \\");
        console.log("  ", vm.toString(invoiceToken), "\\");
        console.log("  src/core/InvoiceToken.sol:InvoiceToken");
        console.log("");

        // 2. KYBRegistry
        console.log("# 2. KYBRegistry");
        console.log("forge verify-contract \\");
        console.log("  --chain-id", vm.toString(block.chainid), "\\");
        console.log("  --watch \\");
        console.log("  --constructor-args $(cast abi-encode 'constructor(address)' ", vm.toString(admin), ") \\");
        console.log("  ", vm.toString(kybRegistry), "\\");
        console.log("  src/compliance/KYBRegistry.sol:KYBRegistry");
        console.log("");

        // 3. BuyerRegistry
        console.log("# 3. BuyerRegistry (no constructor args)");
        console.log("forge verify-contract \\");
        console.log("  --chain-id", vm.toString(block.chainid), "\\");
        console.log("  --watch \\");
        console.log("  ", vm.toString(buyerRegistry), "\\");
        console.log("  src/core/BuyerRegistry.sol:BuyerRegistry");
        console.log("");

        // 4. BusinessRegistry
        console.log("# 4. BusinessRegistry (no constructor args)");
        console.log("forge verify-contract \\");
        console.log("  --chain-id", vm.toString(block.chainid), "\\");
        console.log("  --watch \\");
        console.log("  ", vm.toString(businessRegistry), "\\");
        console.log("  src/core/BusinessRegistry.sol:BusinessRegistry");
        console.log("");

        // 5. CreditOracle
        console.log("# 5. CreditOracle");
        console.log("forge verify-contract \\");
        console.log("  --chain-id", vm.toString(block.chainid), "\\");
        console.log("  --watch \\");
        console.log(string.concat("  --constructor-args $(cast abi-encode 'constructor(address,address)' ",
                     vm.toString(buyerRegistry), " ", vm.toString(admin), ") \\"));
        console.log("  ", vm.toString(creditOracle), "\\");
        console.log("  src/oracle/CreditOracle.sol:CreditOracle");
        console.log("");

        // 6. LiquidityPool
        console.log("# 6. LiquidityPool");
        console.log("forge verify-contract \\");
        console.log("  --chain-id", vm.toString(block.chainid), "\\");
        console.log("  --watch \\");
        console.log(string.concat("  --constructor-args $(cast abi-encode 'constructor(address,address)' ",
                     vm.toString(stablecoin), " ", vm.toString(admin), ") \\"));
        console.log("  ", vm.toString(liquidityPool), "\\");
        console.log("  src/core/LiquidityPool.sol:LiquidityPool");
        console.log("");

        // 7. YieldDistributor
        console.log("# 7. YieldDistributor");
        console.log("forge verify-contract \\");
        console.log("  --chain-id", vm.toString(block.chainid), "\\");
        console.log("  --watch \\");
        console.log(string.concat("  --constructor-args $(cast abi-encode 'constructor(address,address,address,address)' ",
                     vm.toString(stablecoin), " ", vm.toString(invoiceToken), " ",
                     vm.toString(liquidityPool), " ", vm.toString(admin), ") \\"));
        console.log("  ", vm.toString(yieldDistributor), "\\");
        console.log("  src/core/YieldDistributor.sol:YieldDistributor");
        console.log("");

        // 8. InsurancePool
        console.log("# 8. InsurancePool");
        console.log("forge verify-contract \\");
        console.log("  --chain-id", vm.toString(block.chainid), "\\");
        console.log("  --watch \\");
        console.log(string.concat("  --constructor-args $(cast abi-encode 'constructor(address,address,address)' ",
                     vm.toString(stablecoin), " ", vm.toString(invoiceToken), " ", vm.toString(admin), ") \\"));
        console.log("  ", vm.toString(insurancePool), "\\");
        console.log("  src/defi/InsurancePool.sol:InsurancePool");
        console.log("");

        // 9. InvoiceMarketplace
        console.log("# 9. InvoiceMarketplace");
        console.log("forge verify-contract \\");
        console.log("  --chain-id", vm.toString(block.chainid), "\\");
        console.log("  --watch \\");
        console.log(string.concat("  --constructor-args $(cast abi-encode 'constructor(address,address,address)' ",
                     vm.toString(stablecoin), " ", vm.toString(invoiceToken), " ", vm.toString(admin), ") \\"));
        console.log("  ", vm.toString(invoiceMarketplace), "\\");
        console.log("  src/defi/InvoiceMarketplace.sol:InvoiceMarketplace");
        console.log("");

        // 10. InvoiceXCore
        console.log("# 10. InvoiceXCore");
        console.log("forge verify-contract \\");
        console.log("  --chain-id", vm.toString(block.chainid), "\\");
        console.log("  --watch \\");
        console.log(string.concat("  --constructor-args $(cast abi-encode 'constructor(address,address,address,address,address,address,address,address,address)' ",
                     vm.toString(stablecoin), " ",
                     vm.toString(invoiceToken), " ",
                     vm.toString(businessRegistry), " ",
                     vm.toString(buyerRegistry), " ",
                     vm.toString(kybRegistry), " ",
                     vm.toString(creditOracle), " ",
                     vm.toString(liquidityPool), " ",
                     vm.toString(yieldDistributor), " ",
                     vm.toString(admin), ") \\"));
        console.log("  ", vm.toString(invoiceXCore), "\\");
        console.log("  src/core/InvoiceXCore.sol:InvoiceXCore");
        console.log("");

        console.log("================================================");
        console.log("");
        console.log("NOTE: You can also use the --etherscan-api-key flag");
        console.log("if ETHERSCAN_API_KEY is not set in .env");
        console.log("");
        console.log("For Mantle network, use the Mantle Explorer API key:");
        console.log("https://explorer.mantle.xyz/api-docs");
        console.log("");
    }
}
