// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Import all contracts
import "../src/core/InvoiceToken.sol";
import "../src/core/BusinessRegistry.sol";
import "../src/core/BuyerRegistry.sol";
import "../src/compliance/KYBRegistry.sol";
import "../src/oracle/CreditOracle.sol";
import "../src/core/LiquidityPool.sol";
import "../src/core/YieldDistributor.sol";
import "../src/defi/InsurancePool.sol";
import "../src/defi/InvoiceMarketplace.sol";
import "../src/core/InvoiceXCore.sol";
import "../test/mocks/MockUSDT.sol";

/**
 * @title DeployInvoiceX
 * @notice Comprehensive deployment script for the InvoiceX protocol
 * @dev Deploys all contracts in correct dependency order and configures roles
 */
contract DeployInvoiceX is Script {

    // ============================================
    // Deployed Contract Addresses
    // ============================================

    address public stablecoin;
    InvoiceToken public invoiceToken;
    BusinessRegistry public businessRegistry;
    BuyerRegistry public buyerRegistry;
    KYBRegistry public kybRegistry;
    CreditOracle public creditOracle;
    LiquidityPool public liquidityPool;
    YieldDistributor public yieldDistributor;
    InsurancePool public insurancePool;
    InvoiceMarketplace public invoiceMarketplace;
    InvoiceXCore public invoiceXCore;

    // ============================================
    // Configuration
    // ============================================

    address public deployer;
    address public admin;
    address public oracleOperator;

    // ============================================
    // Main Deployment Function
    // ============================================

    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(deployerPrivateKey);

        // Get stablecoin address (or deploy mock for testing)
        if (block.chainid == 31337 || block.chainid == 5003) {
            // Local or Mantle Sepolia - deploy mock USDT
            console.log("Deploying mock USDT for testing...");
            MockUSDT mockUsdt = new MockUSDT();
            stablecoin = address(mockUsdt);
            console.log("Mock USDT deployed at:", stablecoin);

            // Mint some USDT to the deployer for testing
            mockUsdt.mint(deployer, 1_000_000 * 1e6); // 1M USDT
            console.log("Minted 1,000,000 USDT to deployer");
        } else {
            stablecoin = vm.envAddress("STABLECOIN_ADDRESS");
        }

        // Set admin (can be different from deployer)
        admin = vm.envOr("ADMIN_ADDRESS", deployer);
        oracleOperator = vm.envOr("ORACLE_OPERATOR", deployer);

        console.log("=== InvoiceX Protocol Deployment ===");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Admin:", admin);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy in dependency order
        _deployContracts();

        // Configure roles and permissions
        _configureRoles();

        // Link contracts together
        _linkContracts();

        // Initialize pools with default parameters
        _initializePools();

        vm.stopBroadcast();

        // Export deployment addresses
        _exportAddresses();

        console.log("");
        console.log("=== Deployment Complete ===");
    }

    // ============================================
    // Step 1: Deploy Contracts
    // ============================================

    function _deployContracts() internal {
        console.log("Step 1: Deploying contracts...");
        console.log("");

        // 1. Deploy InvoiceToken (no dependencies)
        console.log("1/10: Deploying InvoiceToken...");
        invoiceToken = new InvoiceToken();
        console.log("  InvoiceToken deployed at:", address(invoiceToken));

        // 2. Deploy KYBRegistry (no dependencies)
        console.log("2/10: Deploying KYBRegistry...");
        kybRegistry = new KYBRegistry(admin);
        console.log("  KYBRegistry deployed at:", address(kybRegistry));

        // 3. Deploy BuyerRegistry (no dependencies)
        console.log("3/10: Deploying BuyerRegistry...");
        buyerRegistry = new BuyerRegistry();
        console.log("  BuyerRegistry deployed at:", address(buyerRegistry));

        // 4. Deploy BusinessRegistry (no dependencies)
        console.log("4/10: Deploying BusinessRegistry...");
        businessRegistry = new BusinessRegistry();
        console.log("  BusinessRegistry deployed at:", address(businessRegistry));

        // 5. Deploy CreditOracle (needs BuyerRegistry)
        console.log("5/10: Deploying CreditOracle...");
        creditOracle = new CreditOracle(address(buyerRegistry), admin);
        console.log("  CreditOracle deployed at:", address(creditOracle));

        // 6. Deploy LiquidityPool (needs stablecoin)
        console.log("6/10: Deploying LiquidityPool...");
        liquidityPool = new LiquidityPool(stablecoin, admin);
        console.log("  LiquidityPool deployed at:", address(liquidityPool));

        // 7. Deploy YieldDistributor (needs stablecoin, InvoiceToken, LiquidityPool)
        console.log("7/10: Deploying YieldDistributor...");
        yieldDistributor = new YieldDistributor(
            stablecoin,
            address(invoiceToken),
            address(liquidityPool),
            admin
        );
        console.log("  YieldDistributor deployed at:", address(yieldDistributor));

        // 8. Deploy InsurancePool (needs stablecoin, InvoiceToken)
        console.log("8/10: Deploying InsurancePool...");
        insurancePool = new InsurancePool(
            stablecoin,
            address(invoiceToken),
            admin
        );
        console.log("  InsurancePool deployed at:", address(insurancePool));

        // 9. Deploy InvoiceMarketplace (needs stablecoin, InvoiceToken)
        console.log("9/10: Deploying InvoiceMarketplace...");
        invoiceMarketplace = new InvoiceMarketplace(
            stablecoin,
            address(invoiceToken),
            admin
        );
        console.log("  InvoiceMarketplace deployed at:", address(invoiceMarketplace));

        // 10. Deploy InvoiceXCore (needs all contracts)
        console.log("10/10: Deploying InvoiceXCore...");
        invoiceXCore = new InvoiceXCore(
            stablecoin,
            address(invoiceToken),
            address(businessRegistry),
            address(buyerRegistry),
            address(kybRegistry),
            address(creditOracle),
            address(liquidityPool),
            address(yieldDistributor),
            admin
        );
        console.log("  InvoiceXCore deployed at:", address(invoiceXCore));

        console.log("");
        console.log("All contracts deployed successfully!");
        console.log("");
    }

    // ============================================
    // Step 2: Configure Roles
    // ============================================

    function _configureRoles() internal {
        console.log("Step 2: Configuring roles and permissions...");
        console.log("");

        // InvoiceToken roles
        console.log("Configuring InvoiceToken roles...");
        invoiceToken.grantRole(0x00, admin); // DEFAULT_ADMIN_ROLE
        invoiceToken.grantRole(keccak256("MINTER_ROLE"), address(invoiceXCore));
        invoiceToken.grantRole(keccak256("UPDATER_ROLE"), address(invoiceXCore));
        invoiceToken.grantRole(keccak256("UPDATER_ROLE"), address(yieldDistributor));

        // InvoiceXCore roles
        console.log("Configuring InvoiceXCore roles...");
        invoiceXCore.grantRole(keccak256("ORACLE_CALLBACK_ROLE"), address(creditOracle));
        invoiceXCore.grantRole(keccak256("DEFAULT_HANDLER_ROLE"), admin);
        invoiceXCore.grantRole(keccak256("FUNDER_ROLE"), admin);
        invoiceXCore.grantRole(keccak256("PAUSER_ROLE"), admin);

        // CreditOracle roles
        console.log("Configuring CreditOracle roles...");
        creditOracle.grantRole(keccak256("ORACLE_ROLE"), oracleOperator);

        // LiquidityPool roles
        console.log("Configuring LiquidityPool roles...");
        liquidityPool.grantRole(keccak256("DEPLOYER_ROLE"), address(invoiceXCore));
        liquidityPool.grantRole(keccak256("POOL_MANAGER_ROLE"), admin);

        // InsurancePool roles
        console.log("Configuring InsurancePool roles...");
        insurancePool.grantRole(keccak256("COVERAGE_MANAGER_ROLE"), address(invoiceXCore));
        insurancePool.grantRole(keccak256("CLAIMS_FILER_ROLE"), admin);
        insurancePool.grantRole(keccak256("CLAIMS_APPROVER_ROLE"), admin);
        insurancePool.grantRole(keccak256("CLAIMS_PROCESSOR_ROLE"), admin);

        // BusinessRegistry roles
        console.log("Configuring BusinessRegistry roles...");
        businessRegistry.grantRole(keccak256("VERIFIER_ROLE"), admin);
        businessRegistry.grantRole(keccak256("CREDIT_UPDATER_ROLE"), admin);
        businessRegistry.grantRole(keccak256("STATS_UPDATER_ROLE"), address(invoiceXCore));

        // BuyerRegistry roles
        console.log("Configuring BuyerRegistry roles...");
        buyerRegistry.grantRole(keccak256("REGISTRAR_ROLE"), admin);
        buyerRegistry.grantRole(keccak256("CREDIT_UPDATER_ROLE"), address(creditOracle));
        buyerRegistry.grantRole(keccak256("STATS_UPDATER_ROLE"), address(invoiceXCore));

        console.log("");
        console.log("All roles configured successfully!");
        console.log("");
    }

    // ============================================
    // Step 3: Link Contracts
    // ============================================

    function _linkContracts() internal {
        console.log("Step 3: Linking contracts...");
        console.log("");

        // YieldDistributor already has references from constructor
        // InsurancePool already has references from constructor
        // InvoiceMarketplace already has references from constructor
        // InvoiceXCore already has references from constructor

        console.log("All contracts linked successfully!");
        console.log("");
    }

    // ============================================
    // Step 4: Initialize Pools
    // ============================================

    function _initializePools() internal {
        console.log("Step 4: Initializing liquidity pools...");
        console.log("");

        // Initialize TIER_A pool (Low risk: 8-12% APY)
        console.log("Initializing TIER_A pool...");
        liquidityPool.initializePool(
            LiquidityPool.RiskTier.TIER_A,
            1000, // 10% target APY
            1_000e6, // $1K min deposit
            100_000_000e6, // $100M max deposit per user
            50_000_000e6 // $50M max pool size
        );

        // Initialize TIER_B pool (Medium risk: 15-20% APY)
        console.log("Initializing TIER_B pool...");
        liquidityPool.initializePool(
            LiquidityPool.RiskTier.TIER_B,
            1750, // 17.5% target APY
            5_000e6, // $5K min deposit
            50_000_000e6, // $50M max deposit per user
            30_000_000e6 // $30M max pool size
        );

        // Initialize TIER_C pool (Higher risk: 22-30% APY)
        console.log("Initializing TIER_C pool...");
        liquidityPool.initializePool(
            LiquidityPool.RiskTier.TIER_C,
            2600, // 26% target APY
            10_000e6, // $10K min deposit
            25_000_000e6, // $25M max deposit per user
            10_000_000e6 // $10M max pool size
        );

        // Configure InvoiceXCore auto-funding
        console.log("Enabling auto-funding in InvoiceXCore...");
        invoiceXCore.setAutoFundEnabled(true);

        // Note: InsurancePool is initialized via constructor and doesn't require
        // separate tier configuration in the deployment script

        console.log("");
        console.log("All pools initialized successfully!");
        console.log("");
    }

    // ============================================
    // Step 5: Export Addresses
    // ============================================

    function _exportAddresses() internal view {
        console.log("=== Deployed Contract Addresses ===");
        console.log("");
        console.log("Core Contracts:");
        console.log("  InvoiceToken:        ", address(invoiceToken));
        console.log("  InvoiceXCore:        ", address(invoiceXCore));
        console.log("  BusinessRegistry:    ", address(businessRegistry));
        console.log("  BuyerRegistry:       ", address(buyerRegistry));
        console.log("  KYBRegistry:         ", address(kybRegistry));
        console.log("");
        console.log("Oracle & DeFi:");
        console.log("  CreditOracle:        ", address(creditOracle));
        console.log("  LiquidityPool:       ", address(liquidityPool));
        console.log("  YieldDistributor:    ", address(yieldDistributor));
        console.log("  InsurancePool:       ", address(insurancePool));
        console.log("  InvoiceMarketplace:  ", address(invoiceMarketplace));
        console.log("");
        console.log("Configuration:");
        console.log("  Stablecoin:          ", stablecoin);
        console.log("  Admin:               ", admin);
        console.log("  Oracle Operator:     ", oracleOperator);
        console.log("");

        // Generate JSON output for easy copying
        console.log("=== JSON Format (for frontend) ===");
        console.log("{");
        console.log('  "invoiceToken": "', vm.toString(address(invoiceToken)), '",');
        console.log('  "invoiceXCore": "', vm.toString(address(invoiceXCore)), '",');
        console.log('  "businessRegistry": "', vm.toString(address(businessRegistry)), '",');
        console.log('  "buyerRegistry": "', vm.toString(address(buyerRegistry)), '",');
        console.log('  "kybRegistry": "', vm.toString(address(kybRegistry)), '",');
        console.log('  "creditOracle": "', vm.toString(address(creditOracle)), '",');
        console.log('  "liquidityPool": "', vm.toString(address(liquidityPool)), '",');
        console.log('  "yieldDistributor": "', vm.toString(address(yieldDistributor)), '",');
        console.log('  "insurancePool": "', vm.toString(address(insurancePool)), '",');
        console.log('  "invoiceMarketplace": "', vm.toString(address(invoiceMarketplace)), '",');
        console.log('  "stablecoin": "', vm.toString(stablecoin), '"');
        console.log("}");
    }
}
