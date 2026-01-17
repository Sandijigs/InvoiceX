// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Import all required contracts
import "../test/mocks/MockUSDT.sol";
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

/**
 * @title SimpleFullDeploy
 * @notice Simplified full deployment without complex initialization
 */
contract SimpleFullDeploy is Script {

    function run() external {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        address admin = deployer;

        console.log("=== InvoiceX Simple Full Deployment ===");
        console.log("Deployer:", deployer);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy all contracts
        console.log("Deploying MockUSDT...");
        MockUSDT usdt = new MockUSDT();
        usdt.mint(deployer, 10_000_000 * 1e6);

        console.log("Deploying InvoiceToken...");
        InvoiceToken invoiceToken = new InvoiceToken();

        console.log("Deploying BusinessRegistry...");
        BusinessRegistry businessRegistry = new BusinessRegistry();

        console.log("Deploying BuyerRegistry...");
        BuyerRegistry buyerRegistry = new BuyerRegistry();

        console.log("Deploying KYBRegistry...");
        KYBRegistry kybRegistry = new KYBRegistry(admin);

        console.log("Deploying CreditOracle...");
        CreditOracle creditOracle = new CreditOracle(address(buyerRegistry), admin);

        console.log("Deploying LiquidityPool...");
        LiquidityPool liquidityPool = new LiquidityPool(address(usdt), admin);

        console.log("Deploying YieldDistributor...");
        YieldDistributor yieldDistributor = new YieldDistributor(
            address(usdt),
            address(invoiceToken),
            address(liquidityPool),
            admin
        );

        console.log("Deploying InsurancePool...");
        InsurancePool insurancePool = new InsurancePool(
            address(usdt),
            address(invoiceToken),
            admin
        );

        console.log("Deploying InvoiceMarketplace...");
        InvoiceMarketplace marketplace = new InvoiceMarketplace(
            address(usdt),
            address(invoiceToken),
            admin
        );

        console.log("Deploying InvoiceXCore...");
        InvoiceXCore core = new InvoiceXCore(
            address(usdt),
            address(invoiceToken),
            address(businessRegistry),
            address(buyerRegistry),
            address(kybRegistry),
            address(creditOracle),
            address(liquidityPool),
            address(yieldDistributor),
            admin
        );

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Complete! ===");
        console.log("");
        console.log("Contract Addresses:");
        console.log("------------------");
        console.log("MockUSDT:           ", address(usdt));
        console.log("InvoiceToken:       ", address(invoiceToken));
        console.log("BusinessRegistry:   ", address(businessRegistry));
        console.log("BuyerRegistry:      ", address(buyerRegistry));
        console.log("KYBRegistry:        ", address(kybRegistry));
        console.log("CreditOracle:       ", address(creditOracle));
        console.log("LiquidityPool:      ", address(liquidityPool));
        console.log("YieldDistributor:   ", address(yieldDistributor));
        console.log("InsurancePool:      ", address(insurancePool));
        console.log("InvoiceMarketplace: ", address(marketplace));
        console.log("InvoiceXCore:       ", address(core));
        console.log("");
        console.log("Admin:              ", admin);
    }
}