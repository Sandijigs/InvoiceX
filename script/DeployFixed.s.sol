// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Import MockUSDT
import "../test/mocks/MockUSDT.sol";

// Import all contracts
import "../src/core/InvoiceToken.sol";
import "../src/compliance/KYBRegistry.sol";
import "../src/core/BuyerRegistry.sol";
import "../src/core/BusinessRegistry.sol";
import "../src/oracle/CreditOracle.sol";
import "../src/core/LiquidityPool.sol";
import "../src/core/YieldDistributor.sol";
import "../src/defi/InsurancePool.sol";
import "../src/defi/InvoiceMarketplace.sol";
import "../src/core/InvoiceXCore.sol";

/**
 * @title DeployFixed
 * @notice Fixed deployment script with consistent USDT across all contracts
 */
contract DeployFixed is Script {
    // Contracts
    MockUSDT public usdt;
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

    // Configuration
    address public deployer;
    address public admin;

    function run() external {
        // Load private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(deployerPrivateKey);
        admin = vm.envOr("ADMIN_ADDRESS", deployer);

        console.log("=== InvoiceX Fixed Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Admin:", admin);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy ONE MockUSDT and use it everywhere
        console.log("Deploying MockUSDT...");
        usdt = new MockUSDT();
        console.log("MockUSDT deployed at:", address(usdt));

        // Mint initial supply
        usdt.mint(deployer, 10_000_000 * 1e6); // 10M USDT
        console.log("Minted 10M USDT to deployer");

        // Step 2: Deploy all contracts using the SAME USDT
        _deployContracts(address(usdt));

        // Step 3: Configure contracts
        _configureContracts();

        // Step 4: Initialize pools
        _initializePools();

        vm.stopBroadcast();

        // Export addresses
        _exportAddresses();

        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("All contracts use the same USDT:", address(usdt));
    }

    function _deployContracts(address stablecoin) internal {
        console.log("");
        console.log("Deploying contracts with USDT:", stablecoin);

        // Deploy InvoiceToken
        console.log("Deploying InvoiceToken...");
        invoiceToken = new InvoiceToken();
        console.log("  InvoiceToken:", address(invoiceToken));

        // Deploy KYBRegistry
        console.log("Deploying KYBRegistry...");
        kybRegistry = new KYBRegistry(admin);
        console.log("  KYBRegistry:", address(kybRegistry));

        // Deploy BuyerRegistry
        console.log("Deploying BuyerRegistry...");
        buyerRegistry = new BuyerRegistry();
        console.log("  BuyerRegistry:", address(buyerRegistry));

        // Deploy BusinessRegistry
        console.log("Deploying BusinessRegistry...");
        businessRegistry = new BusinessRegistry();
        console.log("  BusinessRegistry:", address(businessRegistry));

        // Deploy CreditOracle
        console.log("Deploying CreditOracle...");
        creditOracle = new CreditOracle(address(buyerRegistry), admin);
        console.log("  CreditOracle:", address(creditOracle));

        // Deploy LiquidityPool with our USDT
        console.log("Deploying LiquidityPool...");
        liquidityPool = new LiquidityPool(stablecoin, admin);
        console.log("  LiquidityPool:", address(liquidityPool));

        // Deploy YieldDistributor with our USDT
        console.log("Deploying YieldDistributor...");
        yieldDistributor = new YieldDistributor(
            stablecoin,
            address(invoiceToken),
            address(liquidityPool),
            admin
        );
        console.log("  YieldDistributor:", address(yieldDistributor));

        // Deploy InsurancePool with our USDT
        console.log("Deploying InsurancePool...");
        insurancePool = new InsurancePool(
            stablecoin,
            address(invoiceToken),
            admin
        );
        console.log("  InsurancePool:", address(insurancePool));

        // Deploy InvoiceMarketplace with our USDT
        console.log("Deploying InvoiceMarketplace...");
        invoiceMarketplace = new InvoiceMarketplace(
            stablecoin,
            address(invoiceToken),
            admin
        );
        console.log("  InvoiceMarketplace:", address(invoiceMarketplace));

        // Deploy InvoiceXCore with our USDT
        console.log("Deploying InvoiceXCore...");
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
        console.log("  InvoiceXCore:", address(invoiceXCore));
    }

    function _configureContracts() internal {
        console.log("");
        console.log("Configuring contracts...");

        // Grant roles to InvoiceXCore
        invoiceToken.grantRole(invoiceToken.MINTER_ROLE(), address(invoiceXCore));
        invoiceToken.grantRole(invoiceToken.BURNER_ROLE(), address(invoiceXCore));

        // Configure BuyerRegistry roles
        bytes32 registrarRole = buyerRegistry.REGISTRAR_ROLE();
        buyerRegistry.grantRole(registrarRole, address(invoiceXCore));
        buyerRegistry.grantRole(registrarRole, admin);

        // Configure BusinessRegistry roles (using VERIFIER_ROLE)
        bytes32 verifierRole = businessRegistry.VERIFIER_ROLE();
        businessRegistry.grantRole(verifierRole, address(invoiceXCore));
        businessRegistry.grantRole(verifierRole, admin);

        // Configure CreditOracle
        bytes32 oracleRole = creditOracle.ORACLE_ROLE();
        creditOracle.grantRole(oracleRole, admin);

        // Also grant REQUESTER_ROLE to InvoiceXCore
        bytes32 requesterRole = creditOracle.REQUESTER_ROLE();
        creditOracle.grantRole(requesterRole, address(invoiceXCore));

        // Configure InvoiceXCore additional settings
        invoiceXCore.setAutoFundEnabled(true);

        console.log("Contracts configured");
    }

    function _initializePools() internal {
        console.log("");
        console.log("Initializing pools...");

        // Initialize TIER_A (tier, targetAPY, minDeposit, maxDeposit, maxPoolSize)
        liquidityPool.initializePool(
            LiquidityPool.RiskTier.TIER_A,
            1000,
            10000000,
            10000000000,
            100000000000
        );
        console.log("TIER_A initialized: 10% APY");

        // Initialize TIER_B
        liquidityPool.initializePool(
            LiquidityPool.RiskTier.TIER_B,
            1750,
            10000000,
            10000000000,
            100000000000
        );
        console.log("TIER_B initialized: 17.5% APY");

        // Initialize TIER_C
        liquidityPool.initializePool(
            LiquidityPool.RiskTier.TIER_C,
            2600,
            10000000,
            10000000000,
            100000000000
        );
        console.log("TIER_C initialized: 26% APY");

        console.log("Pools initialized");
    }

    function _exportAddresses() internal view {
        console.log("");
        console.log("=== Deployed Addresses ===");
        console.log("MockUSDT:", address(usdt));
        console.log("InvoiceToken:", address(invoiceToken));
        console.log("InvoiceXCore:", address(invoiceXCore));
        console.log("BusinessRegistry:", address(businessRegistry));
        console.log("BuyerRegistry:", address(buyerRegistry));
        console.log("KYBRegistry:", address(kybRegistry));
        console.log("CreditOracle:", address(creditOracle));
        console.log("LiquidityPool:", address(liquidityPool));
        console.log("YieldDistributor:", address(yieldDistributor));
        console.log("InsurancePool:", address(insurancePool));
        console.log("InvoiceMarketplace:", address(invoiceMarketplace));

        console.log("");
        console.log("=== JSON Export ===");
        console.log("{");
        console.log("  \"usdt\": \"", address(usdt), "\",");
        console.log("  \"invoiceToken\": \"", address(invoiceToken), "\",");
        console.log("  \"invoiceXCore\": \"", address(invoiceXCore), "\",");
        console.log("  \"businessRegistry\": \"", address(businessRegistry), "\",");
        console.log("  \"buyerRegistry\": \"", address(buyerRegistry), "\",");
        console.log("  \"kybRegistry\": \"", address(kybRegistry), "\",");
        console.log("  \"creditOracle\": \"", address(creditOracle), "\",");
        console.log("  \"liquidityPool\": \"", address(liquidityPool), "\",");
        console.log("  \"yieldDistributor\": \"", address(yieldDistributor), "\",");
        console.log("  \"insurancePool\": \"", address(insurancePool), "\",");
        console.log("  \"invoiceMarketplace\": \"", address(invoiceMarketplace), "\"");
        console.log("}");
    }
}