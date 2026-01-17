// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Import contracts for step 2
import "../src/oracle/CreditOracle.sol";
import "../src/core/LiquidityPool.sol";
import "../src/core/YieldDistributor.sol";

/**
 * @title DeployStep2
 * @notice Deploy oracle and pool contracts
 */
contract DeployStep2 is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address admin = deployer;

        // Load addresses from previous step
        address stablecoin = vm.envAddress("STABLECOIN_ADDRESS");
        address invoiceToken = vm.envAddress("INVOICE_TOKEN_ADDRESS");
        address buyerRegistry = vm.envAddress("BUYER_REGISTRY_ADDRESS");

        console.log("=== InvoiceX Deployment Step 2: Oracle & Pools ===");
        console.log("Using stablecoin:", stablecoin);
        console.log("Using invoiceToken:", invoiceToken);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy CreditOracle
        console.log("1/3: Deploying CreditOracle...");
        CreditOracle creditOracle = new CreditOracle(buyerRegistry, admin);
        console.log("   CreditOracle deployed at:", address(creditOracle));

        // 2. Deploy LiquidityPool
        console.log("2/3: Deploying LiquidityPool...");
        LiquidityPool liquidityPool = new LiquidityPool(stablecoin, admin);
        console.log("   LiquidityPool deployed at:", address(liquidityPool));

        // 3. Deploy YieldDistributor
        console.log("3/3: Deploying YieldDistributor...");
        YieldDistributor yieldDistributor = new YieldDistributor(
            stablecoin,
            invoiceToken,
            address(liquidityPool),
            admin
        );
        console.log("   YieldDistributor deployed at:", address(yieldDistributor));

        // Initialize liquidity pools
        console.log("");
        console.log("Initializing liquidity pools...");

        // TIER_A
        liquidityPool.initializePool(
            LiquidityPool.RiskTier.TIER_A,
            1000,  // 10% APY
            1000e6,  // $1K min
            100000000e6,  // $100M max per user
            500000000e6  // $500M max pool
        );
        console.log("   TIER_A initialized");

        // TIER_B
        liquidityPool.initializePool(
            LiquidityPool.RiskTier.TIER_B,
            1750,  // 17.5% APY
            5000e6,  // $5K min
            50000000e6,  // $50M max per user
            200000000e6  // $200M max pool
        );
        console.log("   TIER_B initialized");

        // TIER_C
        liquidityPool.initializePool(
            LiquidityPool.RiskTier.TIER_C,
            2600,  // 26% APY
            10000e6,  // $10K min
            25000000e6,  // $25M max per user
            100000000e6  // $100M max pool
        );
        console.log("   TIER_C initialized");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Step 2 Complete ===");
        console.log("Add to .env:");
        console.log("CREDIT_ORACLE_ADDRESS=", vm.toString(address(creditOracle)));
        console.log("LIQUIDITY_POOL_ADDRESS=", vm.toString(address(liquidityPool)));
        console.log("YIELD_DISTRIBUTOR_ADDRESS=", vm.toString(address(yieldDistributor)));
    }
}